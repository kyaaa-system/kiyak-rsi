// Ambil harga harian KOMPAS100 dari Yahoo Finance -> data/prices.json
// Jalan di GitHub Actions (server-side, jadi tidak kena CORS). Node 18+.
import fs from "node:fs";

const TK = "AADI ACES ADMR ADRO AKRA AMMN AMRT ANTM ARCI ARTO ASII BBCA BBNI BBRI BBTN BBYB BFIN BIPI BKSL BMRI BNBR BRIS BRMS BRPT BSDE BUKA BULL BUMI BUVA CBDK CMRY COIN CPIN CTRA CUAN DEWA DSNG ELSA EMAS EMTK ENRG ERAA ESSA EXCL GGRM GOTO HEAL HRTA HRUM ICBP IMPC INCO INDF INDY INET INKP ISAT ITMG JPFA JSMR KIJA KLBF KPIG LSIP MAPA MAPI MBMA MDKA MEDC MIKA MINA MYOR NCKL PANI PGAS PGEO PNLF PSAB PTBA PTRO PWON RAJA RATU RMKE SCMA SGER SMGR SMIL SMRA SSIA TAPG TINS TLKM TOBA TOWR TPIA UNTR UNVR WIFI WIRG".split(" ");
const RANGE = process.env.RANGE || "10y";
const OUT = "data/prices.json";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36";

async function one(t) {
  for (const host of ["query1", "query2"]) {
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch(`https://${host}.finance.yahoo.com/v8/finance/chart/${t}.JK?range=${RANGE}&interval=1d`, { headers: { "User-Agent": UA } });
        if (r.status === 429) { await sleep(2500 * (a + 1)); continue; }
        if (!r.ok) continue;
        const x = (await r.json())?.chart?.result?.[0];
        if (!x?.timestamp) continue;
        const q = x.indicators.quote[0], d = [], o = [], c = [];
        x.timestamp.forEach((s, i) => {
          if (q.close[i] != null && q.open[i] != null) {
            d.push(Math.floor(s / 86400)); o.push(+q.open[i].toFixed(2)); c.push(+q.close[i].toFixed(2));
          }
        });
        if (c.length) return { d, o, c };
      } catch {}
      await sleep(600);
    }
  }
  return null;
}

let old = {};
try { old = JSON.parse(fs.readFileSync(OUT, "utf8")).data || {}; } catch {}

const data = {}, queue = TK.slice(); let ok = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (queue.length) {
    const t = queue.shift(), r = await one(t);
    if (r) { data[t] = r; ok++; } else if (old[t]) data[t] = old[t]; // simbol gagal: pakai data lama
    await sleep(250);
  }
}));

console.log(`Berhasil ${ok}/${TK.length} simbol`);
if (ok < TK.length * 0.5) { console.error("Terlalu banyak gagal, tidak menimpa data."); process.exit(1); }
fs.mkdirSync("data", { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ updated: new Date().toISOString(), range: RANGE, data }));
