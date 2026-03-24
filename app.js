'use strict';

// =============================================
// STATE
// =============================================
const state = {
  malzemeler: [],
  filtreler: {
    sure: null,
    butce: null,
    kisi: '1',
    zorluk: null
  },
  tarifler: [],
  seciliTarif: null,
  sohbetGecmisi: [],
  fotoCache: {}
};

// =============================================
// UI MODULE
// =============================================
const UI = {
  malzemeEkle(malzeme) {
    const temiz = malzeme.trim().toLowerCase();
    if (!temiz) return;
    if (state.malzemeler.includes(temiz)) return;
    state.malzemeler.push(temiz);
    this._malzemeListesiRender();
  },

  malzemeSil(index) {
    state.malzemeler.splice(index, 1);
    this._malzemeListesiRender();
  },

  _malzemeListesiRender() {
    const liste = document.getElementById('malzeme-listesi');
    liste.innerHTML = '';
    state.malzemeler.forEach((m, i) => {
      const tag = document.createElement('span');
      tag.className = 'tag';
      // textContent yerine innerHTML kullanmıyoruz — XSS önlemi (A2)
      tag.textContent = m + ' ';
      const removeBtn = document.createElement('span');
      removeBtn.className = 'remove';
      removeBtn.setAttribute('data-index', i);
      removeBtn.setAttribute('aria-label', `${m} malzemesini sil`);
      removeBtn.setAttribute('role', 'button');
      removeBtn.setAttribute('tabindex', '0');
      removeBtn.textContent = '×';
      removeBtn.addEventListener('click', () => this.malzemeSil(i));
      removeBtn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.malzemeSil(i); }
      });
      tag.appendChild(removeBtn);
      liste.appendChild(tag);
    });
  },

  filtreToggle(kategori, deger) {
    if (state.filtreler[kategori] === deger && kategori !== 'kisi') {
      state.filtreler[kategori] = null;
    } else {
      state.filtreler[kategori] = deger;
    }
    this._filtreButonlariniGuncelle(kategori);
  },

  _filtreButonlariniGuncelle(kategori) {
    const grup = document.querySelector(`.filter-group[data-kategori="${kategori}"]`);
    if (!grup) return;
    grup.querySelectorAll('.filter-btn').forEach(btn => {
      const aktif = btn.dataset.deger === state.filtreler[kategori];
      btn.classList.toggle('active', aktif);
      btn.setAttribute('aria-pressed', aktif ? 'true' : 'false'); // A3
    });
  },

  gosterSection(id) {
    ['hero', 'input-panel', 'results'].forEach(s => {
      document.getElementById(s).style.display = s === id ? '' : 'none';
    });
  },

  tarifleriRender(tarifler) {
    state.tarifler = tarifler;
    const grid = document.getElementById('tarif-grid');
    grid.innerHTML = '';
    tarifler.forEach((tarif, i) => {
      const kart = document.createElement('div');
      kart.className = 'card tarif-kart';
      kart.dataset.index = i;
      kart.innerHTML = `
        <div class="tarif-kart-foto-skeleton skeleton"></div>
        <h3>${tarif.ad}</h3>
        <p>${tarif.aciklama}</p>
        <div class="tarif-kart-meta">
          <span>⏱ ${tarif.sure}</span>
          <span>🍴 ${tarif.zorluk}</span>
          <span>👥 ${tarif.kisi} kişi</span>
        </div>`;
      kart.setAttribute('tabindex', '0');                          // A1
      kart.setAttribute('role', 'button');
      kart.setAttribute('aria-label', `${tarif.ad} tarifini görüntüle`);
      kart.addEventListener('click', () => UI.detayAc(tarif));
      kart.addEventListener('keydown', e => {                      // A1
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); UI.detayAc(tarif); }
      });
      grid.appendChild(kart);

      API.fotografCek(tarif.pexels_arama, tarif.ad).then(url => {
        const skeleton = kart.querySelector('.tarif-kart-foto-skeleton');
        if (!url) { skeleton.remove(); return; }
        const img = document.createElement('img');
        img.className = 'tarif-kart-foto';
        img.src = url;
        img.alt = tarif.ad;
        skeleton.replaceWith(img);
      });
    });
  },

  detayAc(tarif) {
    state.seciliTarif = tarif;
    document.getElementById('modal-ad').textContent = tarif.ad;
    document.getElementById('modal-aciklama').textContent = tarif.aciklama;
    document.getElementById('modal-sure').textContent = '⏱ ' + tarif.sure;
    document.getElementById('modal-zorluk').textContent = '🍴 ' + tarif.zorluk;
    document.getElementById('modal-kisi').textContent = '👥 ' + tarif.kisi + ' kişi';

    const malzemeUl = document.getElementById('modal-malzeme-listesi');
    malzemeUl.innerHTML = tarif.malzemeler.map(m => `<li>${m}</li>`).join('');

    const adimOl = document.getElementById('modal-adim-listesi');
    adimOl.innerHTML = tarif.adimlar.map(a => `<li>${a}</li>`).join('');

    const foto = document.getElementById('modal-foto');
    foto.style.display = 'none';
    const cachedUrl = state.fotoCache[tarif.ad];
    if (cachedUrl) {
      foto.src = cachedUrl;
      foto.style.display = '';
    } else {
      API.fotografCek(tarif.pexels_arama, tarif.ad).then(url => {
        if (url) { foto.src = url; foto.style.display = ''; }
      });
    }

    document.getElementById('detail-modal').style.display = 'flex';
    document.body.style.overflow = 'hidden';

    TatHaritasi.olustur('tatChart', tarif.tat_profili);
  },

  detayKapat() {
    document.getElementById('detail-modal').style.display = 'none';
    document.body.style.overflow = '';
  },

  loadingGoster() {
    const grid = document.getElementById('tarif-grid');
    grid.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const kart = document.createElement('div');
      kart.className = 'card';
      kart.innerHTML = `
        <div class="skeleton" style="height:180px;margin-bottom:16px;border-radius:var(--radius-sm);"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>`;
      grid.appendChild(kart);
    }
    document.getElementById('btn-tarif-ara').disabled = true;
  },

  loadingGizle() {
    document.getElementById('btn-tarif-ara').disabled = false;
  },

  mesajEkle(rol, metin) {
    const kutu = document.getElementById('sohbet-mesajlar');
    const div = document.createElement('div');
    div.className = `sohbet-mesaj ${rol}`;
    div.textContent = metin;
    kutu.appendChild(div);
    kutu.scrollTop = kutu.scrollHeight;
  }
};

// =============================================
// API MODULE
// =============================================
const API = {
  // K3: malzemeler/filtreler parametreleri kaldırıldı — state'den okunuyor
  // userMessage: K1/K2 fix — caller tek bir snapshot alıp her iki yerde kullanır
  async tarifAra(sohbet, userMessage = _kullaniciBilgisiOlustur()) {
    const mesajlar = [
      ...sohbet.slice(-4),  // P1: API'ya son 4 mesaj (2 tur) gönderilir
      { role: 'user', content: userMessage }
    ];

    const yanit = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: mesajlar })
    });

    const metin = await yanit.text();
    let veri;
    try { veri = JSON.parse(metin); } catch { throw new Error(metin.slice(0, 100)); }
    if (!yanit.ok) throw new Error(veri.error || 'API hatası');
    const temiz = veri.content.replace(/```json|```/g, '').trim();
    try {
      return JSON.parse(temiz);
    } catch {
      throw new Error('ayrıştırılamadı');
    }
  },

  async fotografCek(pexelsArama, tarifAd) {
    if (state.fotoCache[tarifAd]) return state.fotoCache[tarifAd];
    try {
      const yanit = await fetch('/api/pexels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ arama: pexelsArama })
      });
      const veri = await yanit.json();
      const url = veri.url || null;
      if (url) state.fotoCache[tarifAd] = url;
      return url;
    } catch {
      return null;
    }
  }
};

// =============================================
// TAT HARİTASI
// =============================================
const TatHaritasi = {
  _chart: null,

  olustur(canvasId, tatProfili) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    if (this._chart) this._chart.destroy();

    this._chart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['🔴 Acı', '🟡 Ekşi', '🟠 Tuzlu', '🟢 Tatlı', '🟤 Umami', '⚪ Bitter'],
        datasets: [{
          data: [
            tatProfili.aci, tatProfili.eksi, tatProfili.tuzlu,
            tatProfili.tatli, tatProfili.umami, tatProfili.bitter
          ],
          backgroundColor: 'rgba(224, 122, 58, 0.15)',
          borderColor: '#E07A3A',
          borderWidth: 2,
          pointBackgroundColor: '#E07A3A',
          pointRadius: 4
        }]
      },
      options: {
        scales: {
          r: {
            min: 0, max: 10,
            ticks: { display: false },
            grid: { color: '#EDE5DC' },
            pointLabels: {
              font: { size: 13, family: 'DM Sans' },
              color: '#6B4C35'
            }
          }
        },
        plugins: { legend: { display: false } },
        animation: { duration: 600, easing: 'easeInOutQuart' }
      }
    });
  }
};

// =============================================
// HELPERS
// =============================================
function _kullaniciBilgisiOlustur() {
  const parcalar = [];
  if (state.malzemeler.length > 0)
    parcalar.push(`Elimdeki malzemeler: ${state.malzemeler.join(', ')}`);
  if (state.filtreler.sure)   parcalar.push(`Süre: ${state.filtreler.sure}`);
  if (state.filtreler.butce)  parcalar.push(`Bütçe: ${state.filtreler.butce}`);
  if (state.filtreler.kisi)   parcalar.push(`Kişi sayısı: ${state.filtreler.kisi}`);
  if (state.filtreler.zorluk) parcalar.push(`Zorluk: ${state.filtreler.zorluk}`);
  return parcalar.join('. ') || 'Bugün ne pişirsem?';
}

// P1: Sohbet geçmişini son 10 mesajla sınırla
function _tarihiKirp() {
  if (state.sohbetGecmisi.length > 10) {
    state.sohbetGecmisi.splice(0, state.sohbetGecmisi.length - 10);
  }
}

function hataGoster(mesaj) {
  const el = document.getElementById('hata-mesaji');
  el.textContent = mesaj;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// =============================================
// EVENTS
// =============================================
const Events = {
  baslat() {
    // Hero → input panel
    document.getElementById('btn-baslayalim').addEventListener('click', () => {
      UI.gosterSection('input-panel');
    });

    // Malzeme ekle — buton
    document.getElementById('btn-malzeme-ekle').addEventListener('click', () => {
      const inp = document.getElementById('malzeme-input');
      UI.malzemeEkle(inp.value);
      inp.value = '';
      inp.focus();
    });

    // Malzeme ekle — Enter
    document.getElementById('malzeme-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const inp = e.target;
        UI.malzemeEkle(inp.value);
        inp.value = '';
      }
    });

    // A3: filtre butonları başlangıç aria-pressed durumu
    document.querySelectorAll('.filter-btn').forEach(btn => btn.setAttribute('aria-pressed', 'false'));

    // Filtre butonları
    document.querySelectorAll('.filter-group').forEach(grup => {
      grup.addEventListener('click', e => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        UI.filtreToggle(grup.dataset.kategori, btn.dataset.deger);
      });
    });

    // Tarif ara
    document.getElementById('btn-tarif-ara').addEventListener('click', async () => {
      UI.gosterSection('results');
      UI.loadingGoster();
      // K1: tek bir snapshot — API'ya gönderilen ve geçmişe yazılan aynı değer
      const kullaniciBilgisi = _kullaniciBilgisiOlustur();
      try {
        const sonuc = await API.tarifAra(state.sohbetGecmisi, kullaniciBilgisi);
        UI.loadingGizle();
        UI.tarifleriRender(sonuc.tarifler);
        state.sohbetGecmisi.push(
          { role: 'user', content: kullaniciBilgisi },
          { role: 'assistant', content: sonuc.tarifler.map(t => t.ad).join(', ') + ' tarif önerildi.' }
        );
        _tarihiKirp(); // P1
      } catch (hata) {
        UI.loadingGizle();
        UI.gosterSection('input-panel');
        hataGoster(hata.message || 'Bir şeyler ters gitti.');
      }
    });

    // Geri butonu
    document.getElementById('btn-geri').addEventListener('click', () => {
      UI.gosterSection('input-panel');
    });

    // Modal kapat
    document.getElementById('btn-modal-kapat').addEventListener('click', () => UI.detayKapat());
    document.getElementById('detail-modal').addEventListener('click', e => {
      if (e.target === e.currentTarget) UI.detayKapat();
    });

    // ESC ile modal kapat
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') UI.detayKapat();
    });

    // Sohbet gönder
    document.getElementById('btn-sohbet-gonder').addEventListener('click', () => _sohbetGonder());
    document.getElementById('sohbet-input').addEventListener('keydown', e => {
      if (e.key === 'Enter') _sohbetGonder();
    });
  }
};

async function _sohbetGonder() {
  const inp = document.getElementById('sohbet-input');
  const metin = inp.value.trim();
  if (!metin) return;
  inp.value = '';

  UI.mesajEkle('user', metin);
  // K2: mesajı geçmişe ÖNCEden ekleme — tarifAra zaten userMessage olarak sonuna ekler.
  // Başarı durumunda geçmişe yazılır; hata durumunda orphan mesaj kalmaz.

  const btn = document.getElementById('btn-sohbet-gonder');
  btn.disabled = true;

  try {
    const sonuc = await API.tarifAra(state.sohbetGecmisi, metin);
    state.sohbetGecmisi.push(
      { role: 'user', content: metin },
      { role: 'assistant', content: sonuc.tarifler.map(t => t.ad).join(', ') + ' tarif önerildi.' }
    );
    _tarihiKirp(); // P1
    UI.tarifleriRender(sonuc.tarifler);
    UI.mesajEkle('assistant', `${sonuc.tarifler.length} yeni tarif önerdim. Kartlara tıklayarak detayları görebilirsin.`);
  } catch {
    UI.mesajEkle('assistant', 'Bir sorun oluştu, tekrar dener misin?');
  } finally {
    btn.disabled = false;
  }
}

// =============================================
// INIT
// =============================================
document.addEventListener('DOMContentLoaded', () => Events.baslat());
