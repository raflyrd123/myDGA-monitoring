#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid     = "Rf";              
const char* password = "123456789";      

const char* supabase_url = "https://ozaepwcalhpmtdfdthlh.supabase.co/rest/v1/sensor_logs";
const char* supabase_key = "sb_secret_VZXMc3FR7M0FYM_LvRAYyg_byMj84t7";

#define LORA_AURORA_V3_NSS  13  
#define LORA_AURORA_V3_RST  16  
#define LORA_AURORA_V3_DIO0 27  
#define LORA_AURORA_V3_EN   15  

void setup() {
  pinMode(LORA_AURORA_V3_EN, OUTPUT);
  digitalWrite(LORA_AURORA_V3_EN, LOW);

  Serial.begin(115200);
  delay(1000);
 
  WiFi.mode(WIFI_STA);
  WiFi.disconnect();  
  delay(100);

  Serial.print("🌐 Connecting to WiFi: ");
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n[OK] Connected to Internet!");

  LoRa.setPins(LORA_AURORA_V3_NSS, LORA_AURORA_V3_RST, LORA_AURORA_V3_DIO0);
  while (!LoRa.begin(920E6)) {
    Serial.println(".");
    delay(500);
  }
 
  LoRa.setSyncWord(0xF3);          
  Serial.println("LoRa Initializing OK! Receiver Standby...");
}

void loop() {
  int packetSize = LoRa.parsePacket();
 
  if (packetSize) {
    String incomingCSV = "";
    while (LoRa.available()) {
      incomingCSV += (char)LoRa.read();
    }
    incomingCSV.trim();

    if (incomingCSV.length() == 0 || incomingCSV == "ACK_OK") return;

    int lora_rssi = LoRa.packetRssi();
    float lora_snr = LoRa.packetSnr();

    Serial.println("\n📡 Received packet: " + incomingCSV);

    int index0 = incomingCSV.indexOf(',');
    int index1 = incomingCSV.indexOf(',', index0 + 1);
    int index2 = incomingCSV.indexOf(',', index1 + 1);
    int index3 = incomingCSV.indexOf(',', index2 + 1);
    int index4 = incomingCSV.indexOf(',', index3 + 1);

    if (index0 == -1 || index1 == -1 || index2 == -1 || index3 == -1 || index4 == -1) {
      Serial.println("❌ CSV Data Frame Corrupted!");
      return;
    }

    String t_trafo   = incomingCSV.substring(0, index0);
    String h_trafo   = incomingCSV.substring(index0 + 1, index1);
    String jarak_raw = incomingCSV.substring(index1 + 1, index2);
    String f_s       = incomingCSV.substring(index2 + 1, index3);
    String p_id      = incomingCSV.substring(index3 + 1, index4);
    String tk_kirim  = incomingCSV.substring(index4 + 1);

    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      http.begin(supabase_url);
     
      http.addHeader("Content-Type", "application/json");
      http.addHeader("apikey", supabase_key);
      http.addHeader("Authorization", String("Bearer ") + supabase_key);

      // JSON PAYLOAD - FIX TYPO PARAMETER
      String jsonPayload = "{";
      jsonPayload += "\"temperature_c\":" + t_trafo + ",";
      jsonPayload += "\"humidity_pct\":" + h_trafo + ",";
      jsonPayload += "\"water_level_cm\":" + jarak_raw + ",";
      jsonPayload += "\"safety_float\":\"" + f_s + "\",";
      jsonPayload += "\"packet_id\":" + p_id + ","; 
      jsonPayload += "\"timestamp_kirim\":" + tk_kirim + ",";
      jsonPayload += "\"lora_rssi\":" + String(lora_rssi) + ","; 
      jsonPayload += "\"lora_snr\":" + String(lora_snr, 2) + ",";
      jsonPayload += "\"oil_color_pct\":0,";
      jsonPayload += "\"hydrogen_h2\":0.0, \"carbon_monoxide_co\":0.0, \"ammonia_nh3\":0.0, \"methane_ch4\":0.0, \"propane_c3h8\":0.0, \"butane_c4h10\":0.0, \"ethylene_c2h4\":0.0, \"acetylene_c2h2\":0.0, \"ethane_c2h6\":0.0";
      jsonPayload += "}";

      int httpResponseCode = http.POST(jsonPayload);

      if (httpResponseCode >= 200 && httpResponseCode < 300) {
        Serial.println("➡️ Supabase Synchronized Successfully! Packet ID: " + p_id);
      } else {
        Serial.println("❌ HTTP POST Failed: " + http.getString());
      }
      http.end();
    }
  }
}
