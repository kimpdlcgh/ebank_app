"""
Builds the Safeguard Securities GCZ26 limited-risk call option overview.

Economics are computed here rather than hardcoded so the document can be
rebuilt against a live quote when one is available. The premium currently shown
is a Black-76 theoretical value derived from Barchart's published implied
volatility for GCZ26 — it is labelled as such throughout and is NOT a
tradeable price.
"""

import base64
import math
import pathlib

HERE = pathlib.Path(__file__).parent
LOGO = base64.b64encode((HERE / "sgs-logo.png").read_bytes()).decode()

# ─────────────────────────────── market inputs (real, 31 Jul 2026) ───────────
F0     = 4134.80    # GCZ26 futures, COMEX (Barchart)
SPOT   = 4086.21    # spot gold
K      = 4100.00    # strike
IV     = 0.2180     # Barchart published IV for GCZ26 options
R      = 0.040      # US risk-free approximation
DAYS   = 116        # to option expiry 24 Nov 2026
NCON   = 3
OZ     = 100        # troy oz per contract
AS_OF  = "31 July 2026"

FIRM = {
    "legal_name": "Safeguard Securities, Inc.",
    "registration": "[REGISTRATION STATUS — e.g. SEC-registered broker-dealer, FINRA member]",
    "crd": "[CRD #]",
    "address": "[REGISTERED ADDRESS]",
    "phone": "[PHONE]",
    "email": "[EMAIL]",
}

# ─────────────────────────────── model ───────────────────────────────────────
def _N(x): return 0.5 * (1 + math.erf(x / math.sqrt(2)))

def black76(F, K, iv, T, r):
    """European call on a futures contract."""
    if T <= 0:
        return max(0.0, F - K)
    d1 = (math.log(F / K) + 0.5 * iv * iv * T) / (iv * math.sqrt(T))
    d2 = d1 - iv * math.sqrt(T)
    return math.exp(-r * T) * (F * _N(d1) - K * _N(d2))

PREM_OZ = black76(F0, K, IV, DAYS / 365, R)
PREM_CT = PREM_OZ * OZ
TOTAL   = PREM_CT * NCON
BE      = K + PREM_OZ
D1      = (math.log(F0 / K) + 0.5 * IV * IV * (DAYS/365)) / (IV * math.sqrt(DAYS/365))
DELTA   = _N(D1)

SCEN = [
    ("Downside",     3900, "Gold retreats below strike. Within the $4,000 floor of the lowered Goldman Sachs / HSBC / J.P. Morgan / StoneX band.", "35–45%"),
    ("Conservative", 4400, "Modest appreciation. Mid-point of the lowered major-bank consensus range.",                                            "25–35%"),
    ("Moderate",     5000, "Sustained safe-haven and central-bank demand. Commerzbank year-end target.",                                            "15–25%"),
    ("Aggressive",   5500, "Macro or geopolitical escalation. UBS year-end target.",                                                                "5–15%"),
]

CHECKS = [("31 Aug 2026", 85), ("30 Sep 2026", 55), ("31 Oct 2026", 24), ("24 Nov 2026", 0)]


def scen_rows():
    out = []
    for name, tgt, note, prob in SCEN:
        intr = max(0.0, tgt - K) * OZ * NCON
        pl = intr - TOTAL
        out.append((name, tgt, intr, pl, pl / TOTAL * 100, note, prob))
    return out


def path_cells(target):
    cells = []
    for _, dleft in CHECKS:
        frac = 1 - (dleft / DAYS)
        Fp = F0 + (target - F0) * frac
        v = black76(Fp, K, IV, dleft / 365, R) * OZ * NCON
        cells.append((Fp, v, (v - TOTAL) / TOTAL * 100))
    return cells


def money(v, dp=0):
    return f"${v:,.{dp}f}"


def pct(v):
    return f"{v:+,.0f}%"


# ─────────────────────────────── table fragments ─────────────────────────────
scen_tbody = "".join(
    f"<tr{' class=\"loss\"' if n=='Downside' else ''}>"
    f"<td><strong>{n}</strong></td>"
    f"<td class=num>{money(t)}</td>"
    f"<td class=num>{((t-F0)/F0*100):+.1f}%</td>"
    f"<td class=num>{money(i)}</td>"
    f"<td class=num><strong>{money(p)}</strong></td>"
    f"<td class=num><strong>{roi:+.1f}%</strong></td>"
    f"<td class=prob>{prob}</td></tr>"
    for n, t, i, p, roi, note, prob in scen_rows()
)

proj_head = "".join(f"<th colspan=2 style='text-align:center'>{n}</th>" for n, _, _, _ in SCEN)
proj_rows = ""
for idx, (label, dleft) in enumerate(CHECKS):
    cells = ""
    for name, tgt, _, _ in SCEN:
        Fp, v, roi = path_cells(tgt)[idx]
        cls = " class='neg'" if roi < 0 else ""
        cells += f"<td class=num>{money(Fp)}</td><td class=num{cls}><strong>{pct(roi)}</strong></td>"
    last = " class='expiry'" if dleft == 0 else ""
    proj_rows += f"<tr{last}><td><strong>{label}</strong>{' — expiry' if dleft==0 else ''}</td>{cells}</tr>"

notes_rows = "".join(
    f"<tr><td><strong>{n}</strong> — {money(t)}</td><td>{note}</td><td class=prob>{prob}</td></tr>"
    for n, t, note, prob in SCEN
)

HTML = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<title>Gold GCZ26 Limited-Risk Call Options — Overview | Safeguard Securities, Inc.</title>
<style>
  @page {{ size:A4; margin:20mm 16mm 18mm 16mm;
    @bottom-left {{ content:"Safeguard Securities, Inc. · Confidential · Options involve risk of total loss"; font-size:7pt; color:#8A8D8F; }}
    @bottom-right {{ content:counter(page) " / " counter(pages); font-size:7.5pt; color:#8A8D8F; }} }}
  @page :first {{ margin:0; }}
  *{{box-sizing:border-box}} html,body{{margin:0;padding:0}}
  body{{font-family:"Segoe UI","Helvetica Neue",Arial,sans-serif;font-size:9.4pt;line-height:1.55;color:#2E3132;
       -webkit-print-color-adjust:exact;print-color-adjust:exact}}
  :root{{--green:#67A243;--blue:#0861A8;--cyan:#2BA9E0;--grey:#6A6C6D;--ink:#22262B;--line:#DFE3E6;--soft:#F5F7F8;--red:#B03A36}}

  .cover{{height:297mm;width:210mm;padding:26mm 20mm 18mm;display:flex;flex-direction:column;page-break-after:always;position:relative}}
  .cover::before{{content:"";position:absolute;top:0;left:0;right:0;height:9mm;
    background:linear-gradient(90deg,var(--green) 0 33%,var(--cyan) 33% 66%,var(--blue) 66% 100%)}}
  .cover-logo{{width:84mm;margin-bottom:22mm}}
  .confidential{{display:inline-block;border:1px solid var(--red);color:var(--red);font-size:7.5pt;font-weight:700;
    letter-spacing:.16em;text-transform:uppercase;padding:2mm 4mm;margin-bottom:7mm}}
  .cover-eyebrow{{font-size:8.5pt;letter-spacing:.22em;text-transform:uppercase;color:var(--grey);font-weight:700;margin-bottom:6mm}}
  .cover h1{{font-size:27pt;line-height:1.15;margin:0 0 5mm;color:var(--ink);font-weight:700;letter-spacing:-.4pt}}
  .cover h1 em{{font-style:normal;color:var(--green)}}
  .cover-sub{{font-size:12pt;color:var(--grey);line-height:1.5;max-width:138mm;margin-bottom:11mm;font-weight:300}}
  .cover-rule{{height:2px;background:var(--line);margin-bottom:7mm}}
  .cover-facts{{display:flex;gap:10mm;margin-bottom:auto}}
  .cf .k{{font-size:7pt;text-transform:uppercase;letter-spacing:.11em;color:var(--grey);font-weight:700}}
  .cf .v{{font-size:14pt;font-weight:700;color:var(--blue);margin-top:1mm}}
  .cf .v.r{{color:var(--red)}} .cf .n{{font-size:7pt;color:var(--grey)}}
  .cover-warn{{border:1px solid var(--red);background:#FDF4F4;padding:4mm;font-size:8.2pt;color:#7A2B28;margin-bottom:6mm}}
  .cover-foot{{border-top:1px solid var(--line);padding-top:4mm;font-size:7.6pt;color:var(--grey)}}

  h2{{font-size:13.5pt;color:var(--ink);margin:0 0 4mm;padding-bottom:2.5mm;border-bottom:2px solid var(--green);font-weight:700}}
  h2 .num{{color:var(--green);margin-right:3mm}}
  h3{{font-size:10pt;color:var(--blue);margin:5mm 0 2mm;font-weight:700}}
  p{{margin:0 0 3mm}} section{{page-break-inside:avoid;margin-bottom:8mm}} .break{{page-break-before:always}}
  ul{{margin:0 0 3mm;padding-left:5mm}} li{{margin-bottom:1.5mm}} strong{{color:var(--ink)}}

  .lede{{background:var(--soft);border-left:3px solid var(--green);padding:4mm 5mm;margin-bottom:4mm;font-size:9.8pt}}
  .alert{{background:#FFF8E8;border:1px solid #E9D08F;border-left:3px solid #D9A521;padding:4mm 5mm;margin-bottom:4mm;font-size:9pt}}
  .alert .t{{font-weight:700;color:#8A6206;margin-bottom:1.5mm;text-transform:uppercase;font-size:7.8pt;letter-spacing:.1em}}
  .danger{{background:#FDF4F4;border:1px solid #E3B3B1;border-left:3px solid var(--red);padding:4mm 5mm;margin-bottom:4mm;font-size:9pt}}
  .danger .t{{font-weight:700;color:var(--red);margin-bottom:1.5mm;text-transform:uppercase;font-size:7.8pt;letter-spacing:.1em}}

  .metrics{{display:grid;grid-template-columns:repeat(4,1fr);gap:3mm;margin-bottom:4mm}}
  .metric{{border:1px solid var(--line);border-top:3px solid var(--blue);padding:3.5mm}}
  .metric .v{{font-size:14pt;font-weight:700;color:var(--ink);line-height:1.1}}
  .metric .k{{font-size:7pt;color:var(--grey);text-transform:uppercase;letter-spacing:.07em;margin-top:1.5mm;font-weight:600}}
  .metric.g{{border-top-color:var(--green)}} .metric.r{{border-top-color:var(--red)}} .metric.r .v{{color:var(--red)}}

  table{{width:100%;border-collapse:collapse;font-size:8.5pt;margin-bottom:3mm}}
  thead th{{background:var(--ink);color:#fff;text-align:left;padding:2.2mm 2.5mm;font-size:7.6pt;
    text-transform:uppercase;letter-spacing:.06em;font-weight:600}}
  tbody td{{padding:2.2mm 2.5mm;border-bottom:1px solid var(--line);vertical-align:top}}
  tbody tr:nth-child(even){{background:#FAFBFC}}
  td.num{{text-align:right;font-variant-numeric:tabular-nums;white-space:nowrap}}
  td.prob{{white-space:nowrap;color:var(--grey)}}
  tr.loss td{{background:#FDF4F4!important;color:#7A2B28}}
  tr.loss td strong{{color:var(--red)}}
  tr.expiry td{{border-top:2px solid var(--ink);font-weight:600}}
  td.neg strong{{color:var(--red)}}
  .spec td:first-child{{width:42%;color:var(--grey)}}
  .two{{display:grid;grid-template-columns:1fr 1fr;gap:5mm}}
  .panel{{border:1px solid var(--line);padding:4mm}}
  .panel h4{{margin:0 0 2.5mm;font-size:9.2pt}}
  .panel.opp{{border-top:3px solid var(--green)}} .panel.opp h4{{color:var(--green)}}
  .panel.risk{{border-top:3px solid var(--red)}} .panel.risk h4{{color:var(--red)}}
  .src{{font-size:7.8pt;line-height:1.5}} .src li{{margin-bottom:1.3mm;word-break:break-word}}
  .disclaimer{{font-size:7.4pt;line-height:1.5;color:#55595C;text-align:justify}}
  .disclaimer h3{{font-size:8.6pt;color:var(--ink)}}
  .ph{{background:#FFF2C9;border-bottom:1px dashed #C79A15;padding:0 1mm}}
  .fnote{{font-size:7.4pt;color:var(--grey);margin-top:-1mm}}
</style></head><body>

<!-- ═══════════════ COVER ═══════════════ -->
<div class="cover">
  <img class="cover-logo" src="data:image/png;base64,{LOGO}" alt="Safeguard Securities, Inc.">
  <div class="confidential">Confidential · Options Risk Disclosure Required</div>
  <div class="cover-eyebrow">Derivatives · Contract Overview</div>
  <h1>Gold December 2026<br><em>Limited-Risk Call Options</em><br>GCZ26 · COMEX</h1>
  <div class="cover-sub">
    A defined-risk bullish position on COMEX gold futures. Maximum loss is limited to
    the premium paid; profit requires gold to settle above the break-even at expiry.
  </div>
  <div class="cover-rule"></div>
  <div class="cover-facts">
    <div class="cf"><div class="k">Underlying</div><div class="v">{money(F0,2)}</div><div class="n">GCZ26, 31 Jul 2026</div></div>
    <div class="cf"><div class="k">Strike</div><div class="v">{money(K)}</div><div class="n">Call option</div></div>
    <div class="cf"><div class="k">Break-even</div><div class="v">{money(BE,2)}</div><div class="n">+{((BE-F0)/F0*100):.1f}% required</div></div>
    <div class="cf"><div class="k">Maximum loss</div><div class="v r">100%</div><div class="n">of premium paid</div></div>
  </div>
  <div class="cover-warn">
    <strong>Options carry a substantial risk of loss and are not suitable for all investors.</strong>
    This position expires worthless if gold settles at or below {money(K)} on 24 November 2026 —
    a loss of the entire premium. Before trading options you must receive and read
    <em>Characteristics and Risks of Standardized Options</em> (the ODD).
  </div>
  <div class="cover-foot">
    <strong>{FIRM["legal_name"]}</strong> · Information as of {AS_OF}.<br>
    For discussion purposes only. Not an offer to sell or a solicitation of an offer to buy any
    security or futures contract. Premium shown is a model-derived indicative value — see Section 03.
  </div>
</div>

<!-- ═══════════════ 01 ═══════════════ -->
<section>
  <h2><span class="num">01</span>Summary</h2>
  <div class="lede">
    The position is a long call on COMEX Gold December 2026 futures (GCZ26) struck at {money(K)},
    expiring <strong>24 November 2026</strong> — <strong>{DAYS} days</strong> from the date of this
    document. Risk is limited and known in advance: the most that can be lost is the premium paid.
    The trade requires gold to rise approximately <strong>{((BE-F0)/F0*100):.1f}%</strong> to break
    even, and appreciates from there.
  </div>

  <div class="alert">
    <div class="t">Correction to previously circulated material</div>
    An earlier internal projection for the November contract (GCX26) stated a premium of
    <strong>$10.08 per troy ounce</strong> for a near-the-money gold call. That figure is not
    consistent with market pricing. Using Barchart's own published implied volatility for GCZ26
    ({IV:.2%}), a near-the-money call with {DAYS} days to expiry values at approximately
    <strong>{money(PREM_OZ,2)} per ounce</strong> — roughly twenty times higher. The return figures in
    that earlier document were an artefact of the understated premium and materially overstated the
    opportunity. <strong>All economics in this document have been recalculated.</strong>
  </div>

  <div class="metrics">
    <div class="metric"><div class="v">{money(PREM_OZ,2)}</div><div class="k">Premium / oz (indicative)</div></div>
    <div class="metric"><div class="v">{money(TOTAL)}</div><div class="k">Total, {NCON} contracts</div></div>
    <div class="metric g"><div class="v">{DELTA:.2f}</div><div class="k">Delta at inception</div></div>
    <div class="metric r"><div class="v">{money(TOTAL)}</div><div class="k">Maximum loss</div></div>
  </div>
</section>

<!-- ═══════════════ 02 ═══════════════ -->
<section>
  <h2><span class="num">02</span>Contract Specifications</h2>
  <table class="spec"><tbody>
    <tr><td>Instrument</td><td><strong>Gold Dec '26 Futures Options (GCZ26)</strong></td></tr>
    <tr><td>Exchange</td><td>COMEX</td></tr>
    <tr><td>Option type / direction</td><td>Call · Long (buy)</td></tr>
    <tr><td>Strike price</td><td><strong>{money(K)}</strong></td></tr>
    <tr><td>Contract size</td><td>100 fine troy ounces</td></tr>
    <tr><td>Point value</td><td>$100 per point</td></tr>
    <tr><td>Minimum tick</td><td>0.10 ($10.00 per contract)</td></tr>
    <tr><td>Contracts</td><td>{NCON} (total exposure {NCON*OZ} oz)</td></tr>
    <tr><td><strong>Option expiration</strong></td><td><strong>24 November 2026 ({DAYS} days)</strong></td></tr>
    <tr><td>Futures first notice / expiry</td><td>30 November 2026 / 29 December 2026</td></tr>
    <tr><td>Underlying futures price</td><td>{money(F0,2)} (31 Jul 2026)</td></tr>
    <tr><td>Spot gold reference</td><td>{money(SPOT,2)}</td></tr>
    <tr><td>Implied volatility</td><td>{IV:.2%} (Barchart, GCZ26 options)</td></tr>
    <tr><td>Futures margin / maintenance</td><td>$22,256 / $20,233 per futures contract</td></tr>
    <tr><td>Break-even at expiry</td><td><strong>{money(BE,2)}</strong> (strike + premium)</td></tr>
    <tr><td>Maximum loss</td><td><strong>{money(TOTAL)}</strong> — 100% of premium</td></tr>
    <tr><td>Maximum gain</td><td>Theoretically unlimited above break-even</td></tr>
  </tbody></table>
  <p class="fnote">
    Buying a call requires no futures margin — the premium is paid in full at inception. Margin
    figures are shown for context on the underlying futures contract only.
  </p>
</section>

<!-- ═══════════════ 03 ═══════════════ -->
<section class="break">
  <h2><span class="num">03</span>Basis of the Premium</h2>
  <div class="danger">
    <div class="t">Indicative valuation — not a tradeable quote</div>
    The premium of <strong>{money(PREM_OZ,2)} per ounce</strong> ({money(PREM_CT)} per contract,
    {money(TOTAL)} for {NCON}) is a <strong>Black-76 theoretical value</strong>, the standard model
    for options on futures. Inputs: underlying {money(F0,2)}, strike {money(K)}, implied volatility
    {IV:.2%} as published by Barchart for GCZ26 options, {DAYS} days to expiry, risk-free rate
    {R:.1%}. It has <strong>not</strong> been verified against a live bid/ask. Actual executable
    prices will differ with the bid-offer spread, order size, and volatility at the moment of trade.
    <strong>Confirm a live quote before any transaction.</strong>
  </div>
  <p>
    As an independent sanity check, the standard at-the-money approximation
    (<em>0.4 × F × σ × √T</em>) gives roughly $203 per ounce on these inputs — consistent with the
    model output and confirming the order of magnitude.
  </p>
</section>

<!-- ═══════════════ 04 ═══════════════ -->
<section>
  <h2><span class="num">04</span>Market Context</h2>
  <p>
    Gold traded at <strong>{money(SPOT,2)}</strong> spot and <strong>{money(F0,2)}</strong> on the
    December COMEX contract on 31 July 2026, easing on the day as the dollar firmed. Gold is
    nonetheless on track for a monthly gain of more than 2% — its first in five months.
  </p>
  <h3>Where the major banks stand</h3>
  <table>
    <thead><tr><th>Institution</th><th>End-2026 target</th><th>Recent revision</th></tr></thead>
    <tbody>
      <tr><td>Goldman Sachs · HSBC · J.P. Morgan · StoneX</td><td class=num>$4,000 – $4,900</td><td>Lowered</td></tr>
      <tr><td>UBS</td><td class=num>$5,500</td><td>Cut from $5,900</td></tr>
      <tr><td>Morgan Stanley</td><td class=num>$5,200</td><td>Cut from $5,700</td></tr>
      <tr><td>Commerzbank</td><td class=num>$5,000</td><td>Raised from $4,400</td></tr>
      <tr><td>J.P. Morgan Global Research</td><td class=num>$6,000</td><td>Bullish outlier; $6,300 possible 2027</td></tr>
    </tbody>
  </table>
  <div class="alert">
    <div class="t">Read this carefully</div>
    Several major banks have <em>lowered</em> their targets, principally because the Federal Reserve
    is no longer expected to cut rates in 2026. The lower half of that consensus range —
    $4,000 to roughly $4,300 — sits <strong>at or below this position's break-even of
    {money(BE,2)}</strong>. On a meaningful part of the mainstream forecast distribution, this
    option expires worthless.
  </div>
  <h3>Positioning</h3>
  <p>
    GCZ26 options show call open interest of <strong>175,627</strong> against put open interest of
    59,503 — a put/call ratio of <strong>0.34</strong>, indicating a pronounced bullish skew in
    positioning. Liquidity is materially deeper than the November contract. Barchart's own technical
    read on GCZ26 futures is nonetheless a <strong>Sell signal with weak strength</strong> — a
    directly opposing indicator, shown here for balance.
  </p>
</section>

<!-- ═══════════════ 05 ═══════════════ -->
<section class="break">
  <h2><span class="num">05</span>Scenario Analysis at Expiry</h2>
  <p>
    Outcomes for {NCON} contracts ({NCON*OZ} oz) at expiry on 24 November 2026. Scenario prices are
    anchored to published bank targets rather than chosen arbitrarily. <strong>The downside case is
    presented first and on the same basis as the others.</strong>
  </p>
  <table>
    <thead><tr><th>Scenario</th><th class=num>Gold at expiry</th><th class=num>Move</th>
      <th class=num>Option value</th><th class=num>Net P&amp;L</th><th class=num>Return</th><th>Est. likelihood</th></tr></thead>
    <tbody>{scen_tbody}</tbody>
  </table>
  <table>
    <thead><tr><th>Scenario basis</th><th>Rationale</th><th>Est. likelihood</th></tr></thead>
    <tbody>{notes_rows}</tbody>
  </table>
  <div class="danger">
    <div class="t">Probability estimates are judgemental</div>
    The likelihood column reflects informed judgement anchored to the published forecast
    distribution. It is <strong>not</strong> derived from an options-implied probability model and
    should not be read as a statistical measure. The single most likely individual outcome band on
    current bank consensus is that gold finishes <em>below</em> the {money(BE,2)} break-even.
  </div>
</section>

<!-- ═══════════════ 06 ═══════════════ -->
<section>
  <h2><span class="num">06</span>Projection to Expiry</h2>
  <p>
    Position value at month-end under each scenario path, assuming a linear move from today's price
    to the scenario target and holding implied volatility constant at {IV:.2%}. Interim values are
    Black-76 marks including remaining time value; the final row is intrinsic value at expiry.
  </p>
  <table>
    <thead>
      <tr><th rowspan=2>Date</th>{proj_head}</tr>
      <tr>{''.join('<th class=num>Gold</th><th class=num>Return</th>' for _ in SCEN)}</tr>
    </thead>
    <tbody>{proj_rows}</tbody>
  </table>
  <div class="alert">
    <div class="t">Why this table stops at November</div>
    The option expires <strong>24 November 2026</strong>. A six-month projection would extend two
    months beyond expiry, into a period in which the contract no longer exists and can have no
    value. The earlier GCX26 material contained this error — projecting returns into December 2026
    and January 2027 for a contract expiring in November. This projection is correctly capped at
    expiry.
  </div>
</section>

<!-- ═══════════════ 07 ═══════════════ -->
<section class="break">
  <h2><span class="num">07</span>Drivers and Risks</h2>
  <div class="two">
    <div class="panel opp">
      <h4>Supportive of the position</h4>
      <ul>
        <li><strong>Central bank accumulation</strong> — sustained structural demand from emerging-market reserve managers.</li>
        <li><strong>Defined, pre-funded risk</strong> — loss cannot exceed the premium; no margin calls, no forced liquidation.</li>
        <li><strong>Convex payoff</strong> — participation in a large move without the capital commitment of outright futures.</li>
        <li><strong>Bullish positioning</strong> — put/call open interest of 0.34 on GCZ26.</li>
        <li><strong>Deep liquidity</strong> — 175,627 call contracts of open interest supports orderly entry and exit.</li>
        <li><strong>Upside targets exist</strong> — Commerzbank $5,000, UBS $5,500, J.P. Morgan Research $6,000 would all be profitable outcomes.</li>
      </ul>
    </div>
    <div class="panel risk">
      <h4>Against the position</h4>
      <ul>
        <li><strong>Total loss is a realistic outcome</strong> — not a tail case. Gold below {money(BE,2)} at expiry loses the whole premium.</li>
        <li><strong>Consensus has moved against it</strong> — Goldman, HSBC, J.P. Morgan, StoneX, UBS and Morgan Stanley all cut targets.</li>
        <li><strong>Fed on hold</strong> — no 2026 rate cut expected; higher real yields raise the opportunity cost of holding gold.</li>
        <li><strong>Time decay accelerates</strong> — theta erodes value fastest in the final 30–60 days.</li>
        <li><strong>Volatility risk</strong> — a fall in implied volatility from {IV:.2%} reduces the option's value even if gold rises.</li>
        <li><strong>Contrary technical signal</strong> — Barchart shows Sell / weak on GCZ26.</li>
        <li><strong>Dollar strength</strong> — a firmer dollar caps dollar-denominated gold.</li>
        <li><strong>Hard expiry</strong> — being directionally right after 24 November 2026 is worth nothing.</li>
      </ul>
    </div>
  </div>
</section>

<!-- ═══════════════ 08 ═══════════════ -->
<section>
  <h2><span class="num">08</span>Suitability</h2>
  <p>This position is intended only for investors who:</p>
  <ul>
    <li>hold the appropriate options approval level for long option purchases;</li>
    <li>have received and read the OCC's <em>Characteristics and Risks of Standardized Options</em>;</li>
    <li>can sustain the <strong>complete loss</strong> of the premium without impairing their financial position;</li>
    <li>understand expiry, assignment, time decay and volatility risk in commodity options;</li>
    <li>are committing only speculative capital, sized as a small portion of a diversified portfolio.</li>
  </ul>
  <p>
    It is <strong>not</strong> suitable for capital preservation, income, or any investor requiring
    liquidity certainty or principal protection.
  </p>
</section>

<!-- ═══════════════ 09 ═══════════════ -->
<section>
  <h2><span class="num">09</span>Sources</h2>
  <ol class="src">
    <li>Barchart — Gold Dec '26 (GCZ26) futures quote and contract specifications. barchart.com/futures/quotes/GCZ26</li>
    <li>Barchart — GCZ26 options overview: implied volatility {IV:.2%}, call/put open interest, put/call ratios. barchart.com/futures/quotes/GCZ26/options</li>
    <li>Trading Economics — spot gold price series, 31 July 2026. tradingeconomics.com/commodity/gold</li>
    <li>Yahoo Finance / Reuters — <em>Analysts see gold to end 2026 below $4,500/ounce</em>. finance.yahoo.com/markets/commodities/articles/analysts-see-gold-end-2026-184814987.html</li>
    <li>J.P. Morgan Global Research — <em>Gold Price Predictions for 2026 and 2027</em>. jpmorgan.com/insights/global-research/commodities/gold-prices</li>
    <li>World Gold Council — <em>Gold Mid-Year Outlook 2026: Point break</em>. gold.org/goldhub/research/gold-mid-year-outlook-2026</li>
    <li>GoldSilver — <em>Gold Price Forecast 2026: What the Major Banks Are Predicting Now</em>. goldsilver.com/industry-news/article/gold-price-forecast-2026-2027-key-predictions-from-top-analysts/</li>
    <li>CME Group — COMEX gold futures and options contract specifications. cmegroup.com</li>
    <li>Options Clearing Corporation — <em>Characteristics and Risks of Standardized Options</em>. theocc.com</li>
  </ol>
  <p class="fnote">
    Valuation methodology: Black (1976) model for European options on futures. Computed by
    {FIRM["legal_name"]} from the inputs stated in Section 03.
  </p>
</section>

<!-- ═══════════════ 10 ═══════════════ -->
<section class="break">
  <h2><span class="num">10</span>Important Disclosures</h2>
  <div class="disclaimer">
    <p><strong>Options risk.</strong> Options involve risk and are not suitable for all investors.
    The purchase of a call option carries the risk of losing the <strong>entire premium paid</strong>
    if the option expires out of the money. Commodity futures and options trading involves
    substantial risk of loss. Before buying or selling any option you must receive a copy of
    <em>Characteristics and Risks of Standardized Options</em> (the Options Disclosure Document),
    available from your {FIRM["legal_name"]} representative or at theocc.com. Supporting
    documentation for any claims or statistical information is available on request.</p>

    <p><strong>Not an offer or recommendation.</strong> This document is provided for informational
    and discussion purposes only. It is not an offer to sell, a solicitation of an offer to buy, or
    a recommendation of any security, futures contract, option, or trading strategy, and does not
    constitute investment, legal, accounting or tax advice. It does not take into account the
    objectives, financial situation or needs of any particular person.</p>

    <p><strong>Indicative pricing.</strong> The premium and all derived figures — break-even, net
    profit and loss, and returns — are calculated from a Black-76 theoretical value using the inputs
    disclosed in Section 03, including implied volatility published by a third party. They are
    <strong>not</strong> live market quotes and have not been verified against an executable bid or
    offer. Actual transaction prices will differ. No transaction should be entered into on the basis
    of these figures without first obtaining a current quotation.</p>

    <p><strong>Hypothetical performance.</strong> The scenarios and projections are hypothetical and
    prepared with the benefit of hindsight on model assumptions. <strong>Hypothetical results have
    inherent limitations and do not represent actual trading.</strong> They assume a linear price
    path and constant implied volatility, neither of which occurs in practice. No representation is
    made that any account will or is likely to achieve profits or losses similar to those shown.
    Past performance and prior price levels are not indicative of future results.</p>

    <p><strong>Forward-looking statements and third-party forecasts.</strong> Price targets
    attributed to third-party institutions are those of the named institutions, are subject to
    revision without notice, and are reproduced for context only. {FIRM["legal_name"]} does not
    endorse them, has not verified them, and expresses no view on their accuracy. Several were
    revised downward in the period preceding this document.</p>

    <p><strong>Probability estimates.</strong> Likelihood ranges are judgemental, are not derived
    from an options-implied probability distribution, do not sum to unity, and must not be relied
    upon as statistical measures of outcome.</p>

    <p><strong>Correction notice.</strong> This document supersedes any prior Safeguard Securities
    material concerning gold call options on the November 2026 (GCX26) or December 2026 (GCZ26)
    contracts. Earlier material contained a premium assumption inconsistent with market pricing and
    projected returns beyond the option's expiry date. Recipients of that material should disregard
    its economics and rely on this document.</p>

    <p><strong>Confidentiality.</strong> Confidential and intended solely for the named recipient.
    Not to be reproduced or distributed without the prior written consent of {FIRM["legal_name"]}.</p>

    <p style="margin-top:4mm;padding-top:3mm;border-top:1px solid var(--line);">
      <strong>{FIRM["legal_name"]}</strong> ·
      <span class="ph">{FIRM["registration"]}</span> ·
      <span class="ph">{FIRM["crd"]}</span><br>
      <span class="ph">{FIRM["address"]}</span> ·
      <span class="ph">{FIRM["phone"]}</span> ·
      <span class="ph">{FIRM["email"]}</span><br>
      © 2026 {FIRM["legal_name"]}. All rights reserved.
    </p>
  </div>
</section>
</body></html>
"""

out = HERE / "gold-gcz26-overview.html"
out.write_text(HTML, encoding="utf-8")
print(f"wrote {out}")
print(f"  premium/oz {PREM_OZ:,.2f} | total {TOTAL:,.2f} | break-even {BE:,.2f} | delta {DELTA:.4f}")
