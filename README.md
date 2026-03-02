# vakitler.github.io

Bu proje, namaz vakitlerini gösteren basit ve modern bir web uygulamasıdır. Kullanıcılar konumlarını seçerek günlük namaz vakitlerini, bir sonraki vakte kalan süreyi ve diğer ilgili bilgileri (hicri tarih, kıble saati vb.) görebilirler.

## Özellikler

- **Namaz Vakitleri:** Günlük namaz vakitlerini gösterir.
- **Konum Seçimi:** Ülke, şehir ve ilçe seçerek yerel vakitleri alır.
- **Geri Sayım:** Bir sonraki namaz vaktine ne kadar süre kaldığını gösteren bir sayaç bulunur.
- **Karanlık/Aydınlık Mod:** Kullanıcının tercihine göre tema değiştirir.
- **Çoklu Dil Desteği:** Türkçe ve İngilizce dillerini destekler.
- **Mobil Uyumlu:** PWA (Progressive Web App) desteği ile mobil cihazlarda uygulama gibi kullanılabilir.

## Teknolojiler

- HTML5
- CSS3 (Tailwind CSS ile)
- Vanilla JavaScript
- Vite (geliştirme ve derleme)

## Kurulum

Projeyi Vite ile geliştirme ve derleme modunda çalıştırabilirsiniz:

```bash
git clone https://github.com/vakitler/vakitler.github.io.git
cd vakitler.github.io
npm install
npm run dev
```

Derleme almak için:

```bash
npm run build
npm run preview
```

## PWA Dosyaları

- `public/manifest.json`: Uygulama adı, tema ve ikon bilgileri
- `public/sw.js`: Basit önbellekleme ve çevrimdışı geri dönüş davranışı

`sw.js` stratejisi:
- API (`https://ezanvakti.emushaf.net`) çağrılarında **network-first** (önce ağ, hata durumunda cache)
- API cache için TTL uygulanır (30 dakika); süresi dolan kayıtlar kullanılmadan silinir
- Aynı origin statik dosyalarda **cache-first**
- Navigasyon isteklerinde çevrimdışı fallback olarak `index.html`

## SEO Dosyaları

- `public/robots.txt`: Arama motoru tarama yönlendirmesi
- `public/sitemap.xml`: Ana sayfa için XML site haritası

## Katkıda Bulunma

Katkılarınızı bekliyoruz! Lütfen bir "pull request" açmaktan çekinmeyin.
