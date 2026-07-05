#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// =========================================================
// 1. KONFIGURASI KONEKSI WI-FI LAB & ENDPOINT SUPABASE
// =========================================================
const char* ssid     = "Rf";                     // Sesuai Wi-Fi lo yang berhasil konek kemarin
const char* password = "123456789";       // Ganti dengan password Wi-Fi kamu

// URL Endpoint REST API langsung menuju ke tabel sensor_logs lo
const char* supabase_url = "https://ozaepwcalhpmtdfdthlh.supabase.co/rest/v1/sensor_logs";
const char* supabase_key = "sb_secret_VZXMc3FR7M0FYM_LvRAYyg_byMj84t7"; // Secret Key bypass RLS

// =========================================================
// 2. PINOUT RESMI REKAYASA HARDWARE COSMIC-ID AURORA V3
// =========================================================
#define LORA_AURORA_V3_NSS  13   // Jalur SPI Chip Select internal (GPIO 13)
#define LORA_AURORA_V3_RST  16   // Jalur Hard Reset internal (GPIO 16)
#define LORA_AURORA_V3_DIO0 27   // Jalur Interrupt internal (GPIO 27)
#define LORA_AURORA_V3_EN   15   // Saklar Daya Utama Chip LoRa (GPIO 15)

void setup() {
  // 1. AKTIFKAN DAYA CHIP LORA SAKLAR UTAMA (CRITICAL FIX)
  pinMode(LORA_AURORA_V3_EN, OUTPUT);
  digitalWrite(LORA_AURORA_V3_EN, LOW); // Active Low = Menyala!

  // Jalankan Serial Monitor PC untuk monitoring gateway via laptop lo
  Serial.begin(115200);
  delay(1000); // Jeda waktu stabilisasi tegangan board saat pertama dicolok
  
  Serial.println("\n--- [INIT] LORA 2 GATEWAY ONLINE ---");

  // =========================================================
  // OPTIMASI WI-FI LAYER (ANTI-STUCK INTERFERENCE LOGIC)
  // =========================================================
  WiFi.mode(WIFI_STA); // Paksa ESP32 masuk ke mode Station (Klien)
  WiFi.disconnect();   // Bersihkan sisa cache koneksi lama di memori flash ESP
  delay(100);

  Serial.print("🌐 Connecting to Wi-Fi 2.4Ghz: ");
  Serial.println(ssid);
  WiFi.begin(ssid, password);
  
  // Menunggu status Wi-Fi hingga terhubung sukses
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("\n[OK] Gateway Berhasil Terhubung ke Internet Wi-Fi!");
  Serial.print("➡️ Assigned IP Address: ");
  Serial.println(WiFi.localIP());
  Serial.println("------------------------------------------------------------------");

  // =========================================================
  // INITIALIZATION CHIP ANTENA RADIO LORA (OFFICIAL RE-MAP)
  // =========================================================
  LoRa.setPins(LORA_AURORA_V3_NSS, LORA_AURORA_V3_RST, LORA_AURORA_V3_DIO0);
  
  // Mengunci frekuensi regional resmi di 920 MHz sesuai spesifikasi board lo
  while (!LoRa.begin(920E6)) {
    Serial.println("❌ LoRa 2 Hardware Error. Mencarinya di sirkuit PCB...");
    delay(500);
  }
  
  // =========================================================
  // MATCHING PARAMETER HIGH SPEED (KEMBAR IDENTIK DENGAN LORA 1)
  // =========================================================
  LoRa.setSyncWord(0xF3);          // Pengunci frekuensi lab biar gak nerima data dari device lain
  LoRa.setSignalBandwidth(125E3);  // Bandwidth standard
  LoRa.setSpreadingFactor(7);      // SF7 Turbo untuk kecepatan interlock tanpa delay udara
  LoRa.setCodingRate4(5);
  
  Serial.println("[OK] LoRa 2 Gateway Receiver Online. Standing by for RF Packets...");
  Serial.println("------------------------------------------------------------------");
}

void loop() {
  // 1. MEMERIKSA APAKAH ADA PAKET GELOMBANG RADIO YANG MASUK DI UDARA
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    // Membaca muatan string data dari LoRa 1 sampai habis
    String incomingPayload = "";
    while (LoRa.available()) {
      incomingPayload += (char)LoRa.read();
    }
    incomingPayload.trim();

    // Validasi pencegahan paket kosong masuk ke database
    if (incomingPayload.length() == 0) return;

    Serial.print("\n📡 Packet RF Tertangkap: ");
    Serial.println(incomingPayload);

    // 2. PARSING STRING JSON RINGKAS YANG DIKIRIM OLEH RASPI
    StaticJsonDocument<256> doc;
    DeserializationError error = deserializeJson(doc, incomingPayload);

    if (error) {
      Serial.print("❌ JSON Parsing Failed: ");
      Serial.println(error.c_str());
      return;
    }

    // Mengurai data dari key ringkas 1 karakter
    float t_trafo      = doc["t"];
    float h_trafo      = doc["h"];
    int oil_color      = doc["c"];
    float water_level  = doc["w"];
    const char* f_stat = doc["f"];

    // 3. TRANSACTION LAYER: UPLOAD INSTAN KE CLOUD SUPABASE (MINIM DELAY)
    if (WiFi.status() == WL_CONNECTED) {
      HTTPClient http;
      
      // Mengaktifkan koneksi ke url REST API Supabase
      http.begin(supabase_url);
      
      // Injeksi HTTP Headers wajib untuk otentikasi admin (service_role)
      http.addHeader("Content-Type", "application/json");
      http.addHeader("apikey", supabase_key);
      http.addHeader("Authorization", String("Bearer ") + supabase_key);

      // Rekonstruksi struktur JSON asli sesuai dengan format kolom di database Supabase kamu
      String jsonPayload = "{";
      jsonPayload += "\"temperature_c\":" + String(t_trafo, 2) + ",";
      jsonPayload += "\"humidity_pct\":" + String(h_trafo, 2) + ",";
      jsonPayload += "\"oil_color_pct\":" + String(oil_color) + ",";
      jsonPayload += "\"water_level_cm\":" + String(water_level, 2) + ",";
      jsonPayload += "\"safety_float\":\"" + String(f_stat) + "\",";
      jsonPayload += "\"hydrogen_h2\":0.0, \"carbon_monoxide_co\":0.0, \"ammonia_nh3\":0.0, \"methane_ch4\":0.0, \"propane_c3h8\":0.0, \"butane_c4h10\":0.0, \"ethylene_c2h4\":0.0, \"acetylene_c2h2\":0.0, \"ethane_c2h6\":0.0";
      jsonPayload += "}";

      // Tembakkan data via HTTP POST
      int httpResponseCode = http.POST(jsonPayload);

      // Evaluasi balasan server
      if (httpResponseCode >= 200 && httpResponseCode < 300) {
        Serial.print("➡️ Supabase Cloud Updated! Status Code: ");
        Serial.println(httpResponseCode);
      } else {
        Serial.print("❌ HTTP POST Rejected. Status Code: ");
        Serial.println(httpResponseCode);
        String responseBody = http.getString();
        Serial.println("Detail Error: " + responseBody);
      }
      
      http.end(); // Bersihkan memori stack HTTP secara berkala
    } else {
      Serial.println("❌ Koneksi Wi-Fi lab terputus! Pengiriman data digagalkan.");
    }
  }
}