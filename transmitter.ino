#include <SPI.h>
#include <LoRa.h>

// =========================================================
// 1. PINOUT HARDWARE INTERNAL LORA AURORA V3 (OFFICIAL)
// =========================================================
#define SS      13   // LORA - NSS
#define RST     16   // LORA - RST
#define DIO0    27   // LORA - DIO0
#define LORA_AURORA_V3_EN 15 // Murni mengunci di 15 untuk power LoRa (Jangan diganggu)

// =========================================================
// 2. RE-MAP PIN UART2 SESUAI PIN SDA & SCL AKTUAL LO 🚀
// =========================================================
#define RXD2    21   // GPIO 21 adalah pin SDA (Hubungkan ke TX Raspi)
#define TXD2    22   // GPIO 22 adalah pin SCL (Hubungkan ke RX Raspi)

#define LORA_BAND 920E6 

void setup() {
  // 1. Nyalakan daya chip LoRa (Tarik ke LOW)
  pinMode(LORA_AURORA_V3_EN, OUTPUT);
  digitalWrite(LORA_AURORA_V3_EN, LOW); 
  delay(100); // Jeda stabilitas hardware

  // 2. Jalankan UART2 pada pin SDA (21) dan SCL (22)
  Serial.begin(115200);
  Serial2.begin(9600, SERIAL_8N1, RXD2, TXD2); 
  
  Serial.println("\n--- [INIT] STARTING LORA 1 TRANSMITTER FIRMWARE ---");
  LoRa.setPins(SS, RST, DIO0);

  // 3. Inisialisasi Antena Radio LoRa
  if (!LoRa.begin(LORA_BAND)) {
    Serial.println("❌ CRITICAL ERROR: Chip Antena LoRa Tidak Terdeteksi!");
    while (1); // Sekarang bagian ini dijamin lolos karena daya chip aman di GPIO 15
  }
  
  LoRa.setSyncWord(0xF3);         
  LoRa.setSignalBandwidth(125E3); 
  LoRa.setSpreadingFactor(7);     
  LoRa.setCodingRate4(5);
  LoRa.setTxPower(20);            

  Serial.println("[OK] LoRa 1 Radio & UART Interface Online.");
  Serial.println("Standing by, waiting for JSON data stream from Raspberry Pi...");
  Serial.println("------------------------------------------------------------------");
}

void loop() {
  if (Serial2.available() > 0) {
    String jsonFromRaspi = Serial2.readStringUntil('\n');
    jsonFromRaspi.trim(); 

    if (jsonFromRaspi.length() > 0) {
      Serial.print("🤖 Data Raspi masuk: ");
      Serial.println(jsonFromRaspi);
      
      LoRa.beginPacket();
      LoRa.print(jsonFromRaspi); 
      LoRa.endPacket();          
      
      Serial2.println("ACK_OK"); // Kirim feedback ACK balik ke Raspi lewat pin SCL (22)
      Serial.println("BERHASIL TRANSMIT! ✅");
    }
  }
}