# 8-BIT SUBS — Abonelik Yönetim Uygulaması

Tamamen yerel çalışan, tek tarayıcıda saklanan ve 8-bit estetiğinde tasarlanmış abonelik yönetim terminali. Kullanıcının düzenli ödemelerini, abonelik maliyetlerini ve gelecekteki finansal yükümlülüklerini takip etmesini sağlar.

## Özellikler

- **Dashboard**: Aylık toplam abonelik gideri, yıllık tahmini gider, günlük ortalama maliyet, aktif abonelik sayısı, yaklaşan ödemelerin toplamı, en pahalı üç abonelik ve geçen aya göre harcama değişimi.
- **Ödeme Takvimi**: Aylık takvim görünümü, ödeme günlerinin takvimde gösterimi, bugünün vurgulanması, önümüzdeki 7 günün ödeme listesi, ödeme yapıldı olarak işaretleme, gecikmiş ödemeler ve ödeme detayına hızlı erişim.
- **Akıllı Bildirimler**: Tarayıcı Notification API kullanılarak ödemeden 3 gün önce, ödeme günü ve ücretsiz deneme bitişine yakın uyarılar. Bildirim izni kullanıcıdan alınır ve aynı ödeme için tekrar bildirim gönderilmez.
- **Abonelik Detayları**: Servis adı, ikon, kategori, ücret, para birimi, ödeme periyodu (haftalık, aylık, üç aylık, altı aylık, yıllık), sonraki ödeme tarihi, başlangıç tarihi, ödeme yöntemi, abonelik durumu, iptal bağlantısı ve kişisel notlar. Ücretsiz deneme abonelikleri için deneme bitiş tarihi ve ücretliye dönüşüm tarihi takibi.
- **İstatistikler**: Aylık harcama grafiği, yıllık harcama özeti, kategori bazlı harcama dağılımı, en pahalı abonelikler, aktif ve iptal edilmiş aboneliklerin karşılaştırması, iptallerden sağlanan tahmini tasarruf ve geçmiş ödeme kayıtları.
- **Bütçe**: Aylık abonelik bütçesi belirleme, harcanan miktar gösterimi, kalan bütçe dinamik hesaplama, bütçe aşımında görsel uyarı ve kategori bazında harcama sınırı.
- **Kullanılmayan Abonelikler**: Kullanıcı tarafından kullanılıyor veya kullanılmıyor olarak işaretleme, ayrı filtreleme ve bu aboneliklerin aylık ve yıllık maliyeti gösterimi.
- **Yedekleme ve Veri Yönetimi**: JSON dışa ve içe aktarma, içe aktarma öncesi veri doğrulama, bozuk dosyanın reddi, içe aktarma öncesi mevcut verilerin otomatik yedeklenmesi, tüm veriyi sıfırlama onay ekranı ve otomatik yerel yedekleme.

## Teknoloji Yığını

- HTML5, CSS3 ve Vanilla JavaScript (ES5 uyumlu).
- Hiçbir harici framework veya kütüphane yok.
- Veriler tarayıcının localStorage'ında saklanır. Backend, sunucu veritabanı veya kullanıcı hesabı yok.

## Klasör Yapısı

- `index.html` — Uygulama iskeleti ve tüm görünümlerin HTML yapısı
- `style.css` — 8-bit pixel art stili ve responsive düzen
- `js/core.js` — Sabitler, tarih matematiği, veri saklama ve yükleme
- `js/views.js` — Görünüm renderleri ve bildirimler
- `js/main.js` — Eylemler, olaylar ve başlatma

## Kurulum

1. Bu depoyu klonlayın veya ZIP olarak indirin.
2. `index.html` dosyasını tarayıcınızda açın.
3. Uygulama anında çalışmaya başlar. Kurulum veya derleme adımı yok.

## Veri Saklama

Tüm veriler yalnızca bu tarayıcıda kalır. Tarayıcı verilerini temizlemek veri kaybına yol açar. “Dışa Aktar” ile JSON yedeği alabilirsiniz.

## Geliştirme Durumu

Proje aşamalı olarak geliştirilmiştir. Mevcut sürüm: v2.0.

## Not

Bildirimler uygulama açıkken veya sekme arka plandayken çalışır. Uygulama tamamen kapalıyken bildirim garantisi yoktur; bu sınır tarayıcı Notification API'sine aittir.
