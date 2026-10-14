// SEKME GEÇİŞ YÖNETİMİ
function switchTab(tabId, btnElem) {
    document.querySelectorAll('.workspace').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    btnElem.classList.add('active');
}

// ==========================================
// MODÜL 1: GERİLİM BÖLÜCÜ (E12 / E24)
// ==========================================
const E12_BASE = [1.0, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
const E24_BASE = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1];
const DECADES = [1000, 10000];

function formatOhm(val) {
    if (val >= 1000000) return +(val / 1000000).toFixed(2) + ' MΩ';
    if (val >= 1000) return +(val / 1000).toFixed(2) + ' kΩ';
    return +val.toFixed(2) + ' Ω';
}

function updateSVG(vin, voutActual, r1, r2) {
    document.getElementById('svg-vin').textContent = `Vin: ${vin}V`;
    document.getElementById('svg-vout').textContent = `Vout: ${voutActual.toFixed(2)}V`;
    document.getElementById('svg-r1').textContent = formatOhm(r1);
    document.getElementById('svg-r2').textContent = formatOhm(r2);
}

function calculateDivider() {
    const vin = parseFloat(document.getElementById('vin').value);
    const voutTarget = parseFloat(document.getElementById('vout').value);
    const series = document.getElementById('series').value;
    const resultsDiv = document.getElementById('results');

    if (!vin || !voutTarget || voutTarget >= vin || voutTarget <= 0) {
        resultsDiv.innerHTML = `<div style="color:#f59e0b; font-size:0.9rem;">Geçerli bir aralık girin (Vin > Vout > 0).</div>`;
        return;
    }

    const baseArray = series === 'E12' ? E12_BASE : E24_BASE;
    const resistors = [];
    DECADES.forEach(d => baseArray.forEach(b => resistors.push(Math.round(b * d))));

    let matches = [];
    for (let r1 of resistors) {
        for (let r2 of resistors) {
            const actualVout = vin * (r2 / (r1 + r2));
            const errorPct = Math.abs((actualVout - voutTarget) / voutTarget) * 100;
            const currentMa = (vin / (r1 + r2)) * 1000;
            matches.push({ r1, r2, actualVout, errorPct, currentMa });
        }
    }

    matches.sort((a, b) => a.errorPct - b.errorPct);
    const topMatches = matches.slice(0, 4);

    updateSVG(vin, topMatches[0].actualVout, topMatches[0].r1, topMatches[0].r2);

    resultsDiv.innerHTML = topMatches.map((m, idx) => `
    <div class="result-card ${idx === 0 ? 'best' : ''}" onclick="updateSVG(${vin}, ${m.actualVout}, ${m.r1}, ${m.r2})">
      <div>
        <div class="res-pair">R1: ${formatOhm(m.r1)}  |  R2: ${formatOhm(m.r2)}</div>
        <div class="res-meta">Çıkış: <strong>${m.actualVout.toFixed(3)}V</strong> • Akım: ${m.currentMa.toFixed(2)} mA</div>
      </div>
      <div class="error-tag">±%${m.errorPct.toFixed(2)}</div>
    </div>
  `).join('');
}

// ==========================================
// MODÜL 2: SMD DEKODER (3/4 Hane, R ve EIA-96)
// ==========================================
const EIA96_VALS = [
    100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158, 162, 165, 169, 174,
    178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255, 261, 267, 274, 280, 287, 294, 301, 309,
    316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412, 422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549,
    562, 576, 590, 604, 619, 634, 649, 665, 681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976
];
const EIA96_MULTS = { 'Z': 0.001, 'Y': 0.01, 'R': 0.01, 'X': 0.1, 'S': 0.1, 'A': 1, 'B': 10, 'H': 10, 'C': 100, 'D': 1000, 'E': 10000, 'F': 100000 };

const SMD_PACKAGES = {
    '0402': { dim: '1.0mm x 0.5mm (0402)', power: 'Maks Güç: 0.0625W (1/16W)', note: '0402 kılıf çok küçüktür; ince uçlu cımbız ve düşük hava akışlı sıcak hava istasyonu gerektirir.' },
    '0603': { dim: '1.6mm x 0.8mm (0603)', power: 'Maks Güç: 0.1W (1/10W)', note: '0603 kılıf kompakt PCB tasarımlarında standarttır. İnce uçlu havya veya sıcak hava ile rahat lehimlenir.' },
    '0805': { dim: '2.0mm x 1.25mm (0805)', power: 'Maks Güç: 0.125W (1/8W)', note: '0805 kılıf prototipleme ve el ile lehimleme için en rahat ve en yaygın SMD boyuttur.' },
    '1206': { dim: '3.2mm x 1.6mm (1206)', power: 'Maks Güç: 0.25W (1/4W)', note: '1206 kılıf yüksek güç gerektiren hatlarda ve altına PCB yolu (trace) geçirmek gerektiğinde tercih edilir.' }
};

function decodeSMD() {
    const raw = document.getElementById('smd-input').value.trim().toUpperCase();
    const pkg = document.getElementById('smd-pkg').value;
    const valEl = document.getElementById('smd-result-val');
    const tolEl = document.getElementById('smd-result-tol');

    document.getElementById('svg-smd-code').textContent = raw || '---';
    document.getElementById('svg-smd-dim').textContent = SMD_PACKAGES[pkg].dim;
    document.getElementById('svg-smd-power').textContent = SMD_PACKAGES[pkg].power;
    document.getElementById('smd-lab-note').innerHTML = `<strong>Lehimleme & Tasarım Notu:</strong> ${SMD_PACKAGES[pkg].note}`;

    if (!raw) {
        valEl.textContent = '---';
        tolEl.textContent = 'Kod girin';
        return;
    }

    // Sıfır Ohm Kontrolü
    if (raw === '0' || raw === '000' || raw === '0000') {
        valEl.textContent = '0 Ω (Jumper)';
        tolEl.textContent = 'Sıfır Ohm Köprü Direnci';
        return;
    }

    // R Notasyonu (Örn: 4R7, R22)
    if (raw.includes('R') && /^[0-9R]+$/.test(raw)) {
        const num = parseFloat(raw.replace('R', '.'));
        if (!isNaN(num)) {
            valEl.textContent = formatOhm(num);
            tolEl.textContent = 'Ondalık (R) Gösterim • ±%1 / ±%5';
            return;
        }
    }

    // EIA-96 Kontrolü (2 Rakam + 1 Harf, Örn: 01C, 68X)
    if (/^[0-9]{2}[A-Z]$/.test(raw)) {
        const idx = parseInt(raw.slice(0, 2), 10);
        const multChar = raw[2];
        if (idx >= 1 && idx <= 96 && EIA96_MULTS[multChar] !== undefined) {
            const resistance = EIA96_VALS[idx - 1] * EIA96_MULTS[multChar];
            valEl.textContent = formatOhm(resistance);
            tolEl.textContent = 'EIA-96 Hassas Seri • ±%1 Tolerans';
            return;
        }
    }

    // 3 veya 4 Haneli Standart Sayısal Kod (Örn: 103, 1002)
    if (/^[0-9]{3,4}$/.test(raw)) {
        const sig = parseInt(raw.slice(0, -1), 10);
        const mult = Math.pow(10, parseInt(raw.slice(-1), 10));
        valEl.textContent = formatOhm(sig * mult);
        tolEl.textContent = raw.length === 3 ? '3-Hane Standart • ±%5 Tolerans' : '4-Hane Hassas • ±%1 Tolerans';
        return;
    }

    valEl.textContent = 'Geçersiz Kod';
    tolEl.textContent = 'Örnek: 103, 4R7, 01C';
}

// ==========================================
// MODÜL 3: ÇEVRİMDIŞI PINOUT VERİTABANI
// ==========================================
const IC_DATABASE = {
    'MAX485': {
        name: 'MAX485 (RS-485 Transceiver)',
        supply: 'Çalışma Gerilimi: 5.0V DC',
        pins: [
            { num: 1, name: 'RO', desc: 'Receiver Output (MCU RX pinine gider)' },
            { num: 2, name: 'RE#', desc: 'Receiver Output Enable (Düşük aktif)' },
            { num: 3, name: 'DE', desc: 'Driver Output Enable (Yüksek aktif)' },
            { num: 4, name: 'DI', desc: 'Driver Input (MCU TX pininden gelir)' },
            { num: 5, name: 'GND', desc: 'Toprak (0V)' },
            { num: 6, name: 'A', desc: 'RS-485 Evirmeyen Hat (Non-inverting)' },
            { num: 7, name: 'B', desc: 'RS-485 Eviren Hat (Inverting)' },
            { num: 8, name: 'VCC', desc: '+5V Besleme Girişi' }
        ],
        note: '<strong>Kritik Donanım Notu:</strong> RE# (Pin 2) ve DE (Pin 3) bacaklarını birbirine bağlayarak tek bir MCU GPIO piniyle Yön Kontrolü (TX/RX) yapabilirsin. Uzun hatların başına ve sonuna <strong>120 Ω sonlandırma direnci</strong> (A ve B arasına) eklemeyi unutma.'
    },
    'NE555': {
        name: 'NE555 (Precision Timer)',
        supply: 'Çalışma Gerilimi: 4.5V - 16V DC',
        pins: [
            { num: 1, name: 'GND', desc: 'Toprak (0V)' },
            { num: 2, name: 'TRIG', desc: 'Tetikleme Girişi (< 1/3 VCC aktif)' },
            { num: 3, name: 'OUT', desc: 'Kare Dalga Çıkışı (Maks 200mA)' },
            { num: 4, name: 'RESET', desc: 'Sıfırlama (Kullanılmıyorsa VCC\'ye çek)' },
            { num: 5, name: 'CTRL', desc: 'Kontrol Voltajı (10nF ile GND\'ye bağla)' },
            { num: 6, name: 'THR', desc: 'Eşik Girişi (> 2/3 VCC çıkışı sıfırlar)' },
            { num: 7, name: 'DIS', desc: 'Deşarj (Zamanlama kondansatörü boşaltma)' },
            { num: 8, name: 'VCC', desc: 'Pozitif Besleme (4.5V - 16V)' }
        ],
        note: '<strong>Kritik Donanım Notu:</strong> Kararsızlıkları önlemek için 4 numaralı RESET bacağını asla boşta (floating) bırakma, doğrudan VCC\'ye bağla. 5 numaralı pini 10nF kondansatör ile toprağa çek.'
    },
    'LM358': {
        name: 'LM358 (Dual Op-Amp)',
        supply: 'Çalışma Gerilimi: 3V - 32V (Single Supply)',
        pins: [
            { num: 1, name: 'OUT1', desc: '1. Op-Amp Çıkışı' },
            { num: 2, name: 'IN1-', desc: '1. Op-Amp Eviren Giriş (-)' },
            { num: 3, name: 'IN1+', desc: '1. Op-Amp Evirmeyen Giriş (+)' },
            { num: 4, name: 'GND', desc: 'Toprak / Negatif Besleme' },
            { num: 5, name: 'IN2+', desc: '2. Op-Amp Evirmeyen Giriş (+)' },
            { num: 6, name: 'IN2-', desc: '2. Op-Amp Eviren Giriş (-)' },
            { num: 7, name: 'OUT2', desc: '2. Op-Amp Çıkışı' },
            { num: 8, name: 'VCC', desc: 'Pozitif Besleme (3V - 32V)' }
        ],
        note: '<strong>Kritik Donanım Notu:</strong> LM358 Rail-to-Rail değildir; maksimum çıkış voltajı <strong>VCC - 1.5V</strong> civarındadır. 5V beslemede çıkıştan en fazla ~3.5V alabilirsin.'
    },
    'TP4056': {
        name: 'TP4056 (1A Li-Ion Şarj IC)',
        supply: 'Giriş Gerilimi: 4.0V - 8.0V (Önerilen 5V)',
        pins: [
            { num: 1, name: 'TEMP', desc: 'NTC Sıcaklık Sensörü (İptal için GND\'ye çek)' },
            { num: 2, name: 'PROG', desc: 'Şarj Akımı Ayar Pini (Rprog ile GND\'ye)' },
            { num: 3, name: 'GND', desc: 'Toprak (Alt soğutucu pad ile birleştir)' },
            { num: 4, name: 'VCC', desc: '+5V Giriş Beslemesi' },
            { num: 5, name: 'BAT', desc: 'Li-Ion Hücre (+) Çıkışı (4.2V Kesim)' },
            { num: 6, name: 'STDBY', desc: 'Şarj Tamamlandı LED Çıkışı (Open-Drain)' },
            { num: 7, name: 'CHRG', desc: 'Şarj Oluyor LED Çıkışı (Open-Drain)' },
            { num: 8, name: 'CE', desc: 'Chip Enable (Aktif etmek için VCC\'ye çek)' }
        ],
        note: '<strong>Rprog Şarj Akımı Tablosu (Pin 2):</strong><br>• <strong>1.2 kΩ</strong> = 1000 mA &nbsp;|&nbsp; <strong>2.0 kΩ</strong> = 580 mA<br>• <strong>3.0 kΩ</strong> = 400 mA &nbsp;|&nbsp; <strong>10 kΩ</strong> = 130 mA'
    }
};

function renderPinout() {
    const key = document.getElementById('ic-select').value;
    const ic = IC_DATABASE[key];

    // SVG 8-Pin DIP/SOIC Çizimi
    let svgHTML = `
    <svg width="280" height="250" viewBox="0 0 280 250">
      <text x="140" y="22" fill="#10b981" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">${ic.supply}</text>
      <!-- IC Gövdesi -->
      <rect x="85" y="40" width="110" height="180" fill="#111827" stroke="#475569" stroke-width="2" rx="4"/>
      <!-- Çentik (Notch) ve Pin 1 Noktası -->
      <path d="M 125 40 A 15 15 0 0 0 155 40" fill="#090d16" stroke="#475569" stroke-width="2"/>
      <circle cx="102" cy="58" r="4" fill="#38bdf8"/>
      <text x="140" y="135" fill="#94a3b8" font-family="monospace" font-size="15" font-weight="bold" text-anchor="middle">${key}</text>
  `;

    // Sol Bacaklar (1-4) ve Sağ Bacaklar (8-5)
    for (let i = 0; i < 4; i++) {
        const y = 60 + i * 40;
        const leftPin = ic.pins[i];
        const rightPin = ic.pins[7 - i];

        // Sol Bacak
        svgHTML += `
      <rect x="65" y="${y - 6}" width="20" height="12" fill="#cbd5e1"/>
      <text x="93" y="${y + 4}" fill="#64748b" font-family="monospace" font-size="11">${leftPin.num}</text>
      <text x="58" y="${y + 4}" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold" text-anchor="end">${leftPin.name}</text>
    `;

        // Sağ Bacak
        svgHTML += `
      <rect x="195" y="${y - 6}" width="20" height="12" fill="#cbd5e1"/>
      <text x="180" y="${y + 4}" fill="#64748b" font-family="monospace" font-size="11" text-anchor="end">${rightPin.num}</text>
      <text x="222" y="${y + 4}" fill="#38bdf8" font-family="monospace" font-size="13" font-weight="bold">${rightPin.name}</text>
    `;
    }

    svgHTML += `</svg>`;
    document.getElementById('ic-svg-box').innerHTML = svgHTML;

    // Sağ Panel Pin Açıklamaları
    document.getElementById('pinout-details').innerHTML = ic.pins.map(p => `
    <div class="result-card" style="padding: 8px 12px; cursor: default;">
      <div class="res-pair" style="color:var(--accent); min-width:85px;">Pin ${p.num}: ${p.name}</div>
      <div class="res-meta" style="margin:0; color:var(--text-main); text-align:right;">${p.desc}</div>
    </div>
  `).join('');

    document.getElementById('ic-lab-note').innerHTML = ic.note;
}

// İlk Yükleme
calculateDivider();
decodeSMD();
renderPinout();
// ==========================================
// MODÜL 4: OP-AMP & RC FİLTRE TASARIMCISI
// ==========================================
const STD_CAPS = [
    { val: 1e-9, label: '1 nF' },
    { val: 10e-9, label: '10 nF' },
    { val: 47e-9, label: '47 nF' },
    { val: 100e-9, label: '100 nF' },
    { val: 1e-6, label: '1 µF' },
    { val: 10e-6, label: '10 µF' }
];

function updateAnalogUI() {
    const mode = document.getElementById('analog-mode').value;
    const label = document.getElementById('analog-input-label');
    const input = document.getElementById('analog-target');

    if (mode === 'rc-lpf') {
        label.textContent = 'Hedef Kesim Frekansı (fc - Hz)';
        input.value = '1000';
        input.step = '50';
    } else {
        label.textContent = 'Hedef Kazanç (Mutlak Av - V/V)';
        input.value = '4.7';
        input.step = '0.1';
    }
    calculateAnalog();
}

function renderAnalogSVG(mode, p1, p2, outText) {
    const box = document.getElementById('analog-svg-box');
    if (mode === 'rc-lpf') {
        box.innerHTML = `
      <svg width="280" height="240" viewBox="0 0 280 240">
        <text x="140" y="25" fill="#10b981" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">${outText}</text>
        <!-- Vin -->
        <circle cx="30" cy="100" r="4" fill="#38bdf8"/>
        <text x="30" y="85" fill="#38bdf8" font-family="monospace" font-size="12" text-anchor="middle">Vin</text>
        <line x1="34" y1="100" x2="75" y2="100" stroke="#94a3b8" stroke-width="2"/>
        <!-- R Direnci -->
        <rect x="75" y="85" width="60" height="30" fill="#1e293b" stroke="#38bdf8" stroke-width="2" rx="4"/>
        <text x="105" y="75" fill="#10b981" font-family="monospace" font-size="13" font-weight="bold" text-anchor="middle">R: ${p1}</text>
        <!-- Orta Düğüm ve Vout -->
        <line x1="135" y1="100" x2="230" y2="100" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="230" cy="100" r="4" fill="#10b981"/>
        <text x="230" y="85" fill="#10b981" font-family="monospace" font-size="12" text-anchor="middle">Vout</text>
        <!-- C Kondansatörü -->
        <line x1="180" y1="100" x2="180" y2="145" stroke="#94a3b8" stroke-width="2"/>
        <line x1="160" y1="145" x2="200" y2="145" stroke="#38bdf8" stroke-width="3"/>
        <line x1="160" y1="155" x2="200" y2="155" stroke="#38bdf8" stroke-width="3"/>
        <text x="210" y="155" fill="#10b981" font-family="monospace" font-size="13" font-weight="bold">C: ${p2}</text>
        <!-- GND -->
        <line x1="180" y1="155" x2="180" y2="195" stroke="#94a3b8" stroke-width="2"/>
        <line x1="165" y1="195" x2="195" y2="195" stroke="#94a3b8" stroke-width="2"/>
        <line x1="172" y1="202" x2="188" y2="202" stroke="#94a3b8" stroke-width="2"/>
      </svg>
    `;
    } else {
        box.innerHTML = `
      <svg width="280" height="250" viewBox="0 0 280 250">
        <text x="140" y="25" fill="#10b981" font-family="monospace" font-size="14" font-weight="bold" text-anchor="middle">${outText}</text>
        <!-- Op-Amp Üçgeni -->
        <polygon points="100,70 100,150 180,110" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
        <text x="110" y="98" fill="#f8fafc" font-family="monospace" font-size="14">-</text>
        <text x="110" y="132" fill="#f8fafc" font-family="monospace" font-size="14">+</text>
        <!-- Çıkış -->
        <line x1="180" y1="110" x2="245" y2="110" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="245" cy="110" r="4" fill="#10b981"/>
        <!-- Geri Besleme (Rf) -->
        <line x1="210" y1="110" x2="210" y2="195" stroke="#94a3b8" stroke-width="2"/>
        <line x1="80" y1="195" x2="210" y2="195" stroke="#94a3b8" stroke-width="2"/>
        <rect x="120" y="182" width="55" height="26" fill="#0f172a" stroke="#10b981" stroke-width="2" rx="3"/>
        <text x="147" y="222" fill="#10b981" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">Rf: ${p1}</text>
        <!-- Eviren Giriş ve Rin -->
        <line x1="80" y1="90" x2="80" y2="195" stroke="#94a3b8" stroke-width="2"/>
        <line x1="20" y1="90" x2="100" y2="90" stroke="#94a3b8" stroke-width="2"/>
        <rect x="30" y="77" width="42" height="26" fill="#0f172a" stroke="#38bdf8" stroke-width="2" rx="3"/>
        <text x="51" y="68" fill="#38bdf8" font-family="monospace" font-size="12" font-weight="bold" text-anchor="middle">Rin: ${p2}</text>
        <!-- Evirmeyen Giriş (+) -->
        <line x1="60" y1="128" x2="100" y2="128" stroke="#94a3b8" stroke-width="2"/>
        <circle cx="60" cy="128" r="4" fill="#38bdf8"/>
      </svg>
    `;
    }
}

function calculateAnalog() {
    const mode = document.getElementById('analog-mode').value;
    const target = parseFloat(document.getElementById('analog-target').value);
    const resDiv = document.getElementById('analog-results');

    if (!target || target <= 0 || (mode === 'non-inv' && target < 1)) {
        resDiv.innerHTML = `<div style="color:#f59e0b; font-size:0.9rem;">Geçerli bir hedef girin (Evirmeyen modda Kazanç ≥ 1 olmalıdır).</div>`;
        return;
    }

    const resistors = [];
    [100, 1000, 10000, 100000].forEach(d => E12_BASE.forEach(b => resistors.push(Math.round(b * d))));
    let matches = [];

    if (mode === 'rc-lpf') {
        for (let r of resistors) {
            for (let c of STD_CAPS) {
                const fc = 1 / (2 * Math.PI * r * c.val);
                const errorPct = Math.abs((fc - target) / target) * 100;
                matches.push({ p1: formatOhm(r), p2: c.label, actual: fc, errorPct, label: `fc: ${fc.toFixed(1)} Hz (-3dB)` });
            }
        }
    } else {
        const subRes = resistors.filter(r => r >= 1000 && r <= 100000);
        for (let rf of subRes) {
            for (let rin of subRes) {
                const av = mode === 'non-inv' ? 1 + (rf / rin) : (rf / rin);
                const errorPct = Math.abs((av - target) / target) * 100;
                const sign = mode === 'inv' ? '-' : '+';
                matches.push({ p1: formatOhm(rf), p2: formatOhm(rin), actual: av, errorPct, label: `Kazanç: ${sign}${av.toFixed(2)} V/V` });
            }
        }
    }

    matches.sort((a, b) => a.errorPct - b.errorPct);
    const top = matches.slice(0, 4);

    renderAnalogSVG(mode, top[0].p1, top[0].p2, top[0].label);

    resDiv.innerHTML = top.map((m, idx) => `
    <div class="result-card ${idx === 0 ? 'best' : ''}" onclick="renderAnalogSVG('${mode}', '${m.p1}', '${m.p2}', '${m.label}')">
      <div>
        <div class="res-pair">${mode === 'rc-lpf' ? 'R: ' + m.p1 + ' | C: ' + m.p2 : 'Rf: ' + m.p1 + ' | Rin: ' + m.p2}</div>
        <div class="res-meta">Gerçek Değer: <strong>${m.label}</strong></div>
      </div>
      <div class="error-tag">±%${m.errorPct.toFixed(2)}</div>
    </div>
  `).join('');
}

// İlk Açılışta Analog Modülü Başlat
calculateAnalog();

// PWA SERVICE WORKER KAYDI
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(() => { });
    });
}