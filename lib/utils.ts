// Tarih işlemleri için yardımcı fonksiyonlar

// Türkiye timezone'u için tarih oluştur
export function createTurkeyDate(dateString: string | Date): Date {
  const date = new Date(dateString);
  // Türkiye timezone'u (UTC+3) için offset ekle
  const turkeyOffset = 3 * 60; // 3 saat = 180 dakika
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utc + (turkeyOffset * 60000));
}

// Tarih formatını düzenle (Türkiye timezone'u ile)
export function formatDate(dateString: string | Date, includeTime: boolean = true): string {
  const date = createTurkeyDate(dateString);
  
  if (includeTime) {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Istanbul'
    });
  } else {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Europe/Istanbul'
    });
  }
}

// Maç durumunu kontrol et (Türkiye timezone'u ile)
export function isMatchStarted(matchDate: string | Date): boolean {
  const matchDateTurkey = createTurkeyDate(matchDate);
  const nowTurkey = createTurkeyDate(new Date());
  return matchDateTurkey <= nowTurkey;
}

// Maç durumunu kontrol et (Türkiye timezone'u ile)
export function isMatchFinished(matchDate: string | Date): boolean {
  const matchDateTurkey = createTurkeyDate(matchDate);
  const nowTurkey = createTurkeyDate(new Date());
  // Maç tarihi + 3 saat (tipik maç süresi) geçmişse bitmiş say
  const matchEndTime = new Date(matchDateTurkey.getTime() + (3 * 60 * 60 * 1000));
  return matchEndTime <= nowTurkey;
}

// Tarih karşılaştırması (Türkiye timezone'u ile)
export function compareDates(date1: string | Date, date2: string | Date): number {
  const turkeyDate1 = createTurkeyDate(date1);
  const turkeyDate2 = createTurkeyDate(date2);
  return turkeyDate1.getTime() - turkeyDate2.getTime();
}

// Şu anki tarihi Türkiye timezone'u ile al
export function getCurrentTurkeyDate(): Date {
  return createTurkeyDate(new Date());
} 

// Date'i input type="datetime-local" için uygun stringe çevir (Türkiye saatiyle)
export function formatInputDateLocal(dateString: string | Date): string {
  const date = createTurkeyDate(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
} 