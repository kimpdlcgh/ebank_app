"""
Builds the Safeguard Securities client overview HTML with the logo embedded.

Kept as a script so the document can be regenerated when facts change — this
material is time-sensitive and the valuation/IPO position has already moved
twice in 2026.
"""

import base64
import pathlib

HERE = pathlib.Path(__file__).parent
LOGO = base64.b64encode((HERE / "sgs-logo.png").read_bytes()).decode()

# ---------------------------------------------------------------- placeholders
# Not invented. Replace before this document is sent to any client.
FIRM = {
    "legal_name": "Safeguard Securities, Inc.",
    "registration": "[REGISTRATION STATUS — e.g. SEC-registered broker-dealer, FINRA member]",
    "crd": "[CRD #]",
    "address": "[REGISTERED ADDRESS]",
    "phone": "[PHONE]",
    "email": "[EMAIL]",
    "website": "[WEBSITE]",
}

AS_OF = "31 July 2026"

HTML = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Databricks — Late-Stage Private Opportunity Overview | Safeguard Securities, Inc.</title>
<style>
  @page {{
    size: A4;
    margin: 20mm 16mm 18mm 16mm;
    @bottom-left {{ content: "Safeguard Securities, Inc. · Confidential"; font-size: 7.5pt; color: #8A8D8F; }}
    @bottom-right {{ content: counter(page) " / " counter(pages); font-size: 7.5pt; color: #8A8D8F; }}
  }}
  @page :first {{ margin: 0; }}

  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; padding: 0; }}
  body {{
    font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 9.6pt;
    line-height: 1.55;
    color: #2E3132;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }}

  /* ---------- brand ---------- */
  :root {{
    --green: #67A243;
    --blue:  #0861A8;
    --cyan:  #2BA9E0;
    --grey:  #6A6C6D;
    --ink:   #22262B;
    --line:  #DFE3E6;
    --soft:  #F5F7F8;
  }}

  /* ---------- cover ---------- */
  .cover {{
    height: 297mm; width: 210mm;
    padding: 26mm 20mm 18mm 20mm;
    display: flex; flex-direction: column;
    page-break-after: always;
    position: relative;
  }}
  .cover::before {{
    content: ""; position: absolute; top: 0; left: 0; right: 0; height: 9mm;
    background: linear-gradient(90deg, var(--green) 0%, var(--green) 33%, var(--cyan) 33%, var(--cyan) 66%, var(--blue) 66%, var(--blue) 100%);
  }}
  .cover-logo {{ width: 84mm; margin-bottom: 26mm; }}
  .cover-eyebrow {{
    font-size: 8.5pt; letter-spacing: .22em; text-transform: uppercase;
    color: var(--grey); font-weight: 700; margin-bottom: 7mm;
  }}
  .cover h1 {{
    font-size: 30pt; line-height: 1.14; margin: 0 0 6mm 0;
    color: var(--ink); font-weight: 700; letter-spacing: -.4pt;
  }}
  .cover h1 em {{ font-style: normal; color: var(--green); }}
  .cover-sub {{
    font-size: 12.5pt; color: var(--grey); line-height: 1.5;
    max-width: 135mm; margin-bottom: 14mm; font-weight: 300;
  }}
  .cover-rule {{ height: 2px; background: var(--line); margin: 0 0 8mm 0; }}
  .cover-facts {{ display: flex; gap: 12mm; margin-bottom: auto; }}
  .cover-fact .k {{ font-size: 7.5pt; text-transform: uppercase; letter-spacing: .12em; color: var(--grey); font-weight: 700; }}
  .cover-fact .v {{ font-size: 15pt; font-weight: 700; color: var(--blue); margin-top: 1mm; }}
  .cover-fact .n {{ font-size: 7.5pt; color: var(--grey); }}
  .cover-foot {{ border-top: 1px solid var(--line); padding-top: 5mm; font-size: 8pt; color: var(--grey); }}
  .cover-foot strong {{ color: var(--ink); }}
  .confidential {{
    display: inline-block; border: 1px solid var(--green); color: var(--green);
    font-size: 7.5pt; font-weight: 700; letter-spacing: .16em; text-transform: uppercase;
    padding: 2mm 4mm; margin-bottom: 8mm;
  }}

  /* ---------- typography ---------- */
  h2 {{
    font-size: 14pt; color: var(--ink); margin: 0 0 4mm 0; padding-bottom: 2.5mm;
    border-bottom: 2px solid var(--green); font-weight: 700; letter-spacing: -.2pt;
  }}
  h2 .num {{ color: var(--green); margin-right: 3mm; }}
  h3 {{ font-size: 10.5pt; color: var(--blue); margin: 6mm 0 2mm 0; font-weight: 700; }}
  p {{ margin: 0 0 3mm 0; }}
  section {{ page-break-inside: avoid; margin-bottom: 9mm; }}
  .break {{ page-break-before: always; }}
  ul {{ margin: 0 0 3mm 0; padding-left: 5mm; }}
  li {{ margin-bottom: 1.6mm; }}
  strong {{ color: var(--ink); }}
  a {{ color: var(--blue); text-decoration: none; }}

  /* ---------- components ---------- */
  .lede {{
    background: var(--soft); border-left: 3px solid var(--green);
    padding: 4mm 5mm; margin-bottom: 5mm; font-size: 10pt; line-height: 1.6;
  }}
  .alert {{
    background: #FFF8E8; border: 1px solid #E9D08F; border-left: 3px solid #D9A521;
    padding: 4mm 5mm; margin-bottom: 5mm; font-size: 9.2pt;
  }}
  .alert .t {{ font-weight: 700; color: #8A6206; margin-bottom: 1.5mm; text-transform: uppercase; font-size: 8pt; letter-spacing: .1em; }}

  .metrics {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; margin-bottom: 5mm; }}
  .metric {{ border: 1px solid var(--line); border-top: 3px solid var(--blue); padding: 3.5mm; }}
  .metric .v {{ font-size: 15pt; font-weight: 700; color: var(--ink); line-height: 1.1; }}
  .metric .k {{ font-size: 7.5pt; color: var(--grey); text-transform: uppercase; letter-spacing: .08em; margin-top: 1.5mm; font-weight: 600; }}
  .metric.g {{ border-top-color: var(--green); }}

  table {{ width: 100%; border-collapse: collapse; font-size: 8.8pt; margin-bottom: 4mm; }}
  thead th {{
    background: var(--ink); color: #fff; text-align: left; padding: 2.5mm 3mm;
    font-size: 8pt; text-transform: uppercase; letter-spacing: .07em; font-weight: 600;
  }}
  tbody td {{ padding: 2.5mm 3mm; border-bottom: 1px solid var(--line); vertical-align: top; }}
  tbody tr:nth-child(even) {{ background: #FAFBFC; }}
  td.num {{ text-align: right; font-variant-numeric: tabular-nums; white-space: nowrap; }}

  .two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }}
  .panel {{ border: 1px solid var(--line); padding: 4mm; }}
  .panel h4 {{ margin: 0 0 2.5mm 0; font-size: 9.5pt; }}
  .panel.opp {{ border-top: 3px solid var(--green); }}
  .panel.opp h4 {{ color: var(--green); }}
  .panel.risk {{ border-top: 3px solid #C0504D; }}
  .panel.risk h4 {{ color: #C0504D; }}

  .timeline {{ border-left: 2px solid var(--line); padding-left: 5mm; margin: 4mm 0; }}
  .tl {{ position: relative; margin-bottom: 3.5mm; }}
  .tl::before {{
    content: ""; position: absolute; left: -6.9mm; top: 1.4mm;
    width: 2.6mm; height: 2.6mm; border-radius: 50%; background: var(--green);
  }}
  .tl .d {{ font-size: 7.8pt; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: .06em; }}
  .tl .b {{ font-size: 9.2pt; }}

  .src {{ font-size: 8pt; line-height: 1.5; }}
  .src li {{ margin-bottom: 1.4mm; word-break: break-word; }}
  .disclaimer {{ font-size: 7.6pt; line-height: 1.5; color: #55595C; text-align: justify; }}
  .disclaimer h3 {{ font-size: 9pt; color: var(--ink); }}
  .ph {{ background: #FFF2C9; border-bottom: 1px dashed #C79A15; padding: 0 1mm; }}
</style>
</head>
<body>

<!-- ══════════════════════════ COVER ══════════════════════════ -->
<div class="cover">
  <img class="cover-logo" src="data:image/png;base64,{LOGO}" alt="Safeguard Securities, Inc.">

  <div class="confidential">Confidential — For Client Discussion</div>
  <div class="cover-eyebrow">Late-Stage Private Markets · Company Overview</div>

  <h1>Databricks<br><em>The Data &amp; AI Platform</em><br>at $188 Billion</h1>

  <div class="cover-sub">
    An independent overview of Databricks' fundamentals, valuation trajectory,
    competitive position and route to liquidity — prepared for qualified investors
    evaluating late-stage private exposure.
  </div>

  <div class="cover-rule"></div>

  <div class="cover-facts">
    <div class="cover-fact">
      <div class="k">Valuation</div>
      <div class="v">$188B</div>
      <div class="n">July 2026, Coatue-led</div>
    </div>
    <div class="cover-fact">
      <div class="k">Revenue Run-Rate</div>
      <div class="v">$6.9B</div>
      <div class="n">June 2026, +80% YoY</div>
    </div>
    <div class="cover-fact">
      <div class="k">Net Retention</div>
      <div class="v">&gt;140%</div>
      <div class="n">Series L disclosure</div>
    </div>
    <div class="cover-fact">
      <div class="k">IPO Window</div>
      <div class="v">2027+</div>
      <div class="n">Per CEO, June 2026</div>
    </div>
  </div>

  <div class="cover-foot">
    <strong>{FIRM["legal_name"]}</strong><br>
    Information as of {AS_OF}. This document is an overview for discussion purposes only and is
    not an offer to sell or a solicitation of an offer to buy any security.
    Please read the risk factors and disclaimer in full.
  </div>
</div>

<!-- ══════════════════════════ 1 ══════════════════════════ -->
<section>
  <h2><span class="num">01</span>Executive Summary</h2>

  <div class="lede">
    Databricks has become one of the largest and fastest-growing private software companies in the
    world, with a <strong>$188 billion valuation</strong> as of July 2026 and a
    <strong>$6.9 billion annualised revenue run-rate</strong> growing more than 80% year-over-year.
    The company is free-cash-flow positive and, by its CEO's own account, does not need to raise
    public capital — which is precisely why the timing of any listing is now a matter of choice
    rather than necessity.
  </div>

  <div class="alert">
    <div class="t">Important change since earlier materials</div>
    On <strong>4 June 2026</strong>, CEO Ali Ghodsi publicly stated that 2026 is
    <em>"a terrible year to go public,"</em> citing an IPO market absorbing very large offerings
    from SpaceX, Anthropic and OpenAI. He has indicated a listing <strong>no earlier than 2027</strong>.
    Any prior material describing a 2026 Databricks IPO should be treated as superseded.
    The investment question today is a <strong>late-stage private</strong> one, not an IPO-timing one.
  </div>

  <h3>What this means for investors</h3>
  <ul>
    <li><strong>The fundamentals strengthened while the listing moved out.</strong> Valuation rose
        roughly 40% from $134B to $188B in seven months, and the run-rate grew from $4.8B to $6.9B.</li>
    <li><strong>Liquidity is the stated reason for an eventual IPO</strong> — creating a market
        mechanism for employee equity — rather than a need for growth capital.</li>
    <li><strong>The holding period is longer than previously framed.</strong> Exposure taken today
        should be underwritten against a 2027-or-later liquidity event, with the associated
        illiquidity and mark-to-market uncertainty.</li>
  </ul>
</section>

<!-- ══════════════════════════ 2 ══════════════════════════ -->
<section>
  <h2><span class="num">02</span>Company Snapshot</h2>

  <div class="metrics">
    <div class="metric"><div class="v">$188B</div><div class="k">Valuation (Jul 2026)</div></div>
    <div class="metric g"><div class="v">$6.9B</div><div class="k">Revenue run-rate</div></div>
    <div class="metric"><div class="v">+80%</div><div class="k">YoY growth</div></div>
    <div class="metric g"><div class="v">&gt;140%</div><div class="k">Net revenue retention</div></div>
    <div class="metric g"><div class="v">20,000+</div><div class="k">Customers worldwide</div></div>
    <div class="metric"><div class="v">700+</div><div class="k">Clients at $1M+ ARR</div></div>
    <div class="metric"><div class="v">&gt;60%</div><div class="k">Of the Fortune 500</div></div>
    <div class="metric g"><div class="v">80%+</div><div class="k">Gross margin</div></div>
  </div>

  <p>
    Databricks operates a unified data and AI platform spanning data engineering, warehousing,
    machine learning and business intelligence. Its differentiation against point solutions is
    breadth: rather than competing narrowly with a data warehouse or an ML platform, it consolidates
    the stack — which supports both higher net retention and a premium multiple relative to peers.
  </p>
</section>

<!-- ══════════════════════════ 3 ══════════════════════════ -->
<section class="break">
  <h2><span class="num">03</span>Valuation &amp; Funding Trajectory</h2>

  <table>
    <thead>
      <tr><th>Date</th><th>Round</th><th class="num">Raised</th><th class="num">Valuation</th><th>Lead / Note</th></tr>
    </thead>
    <tbody>
      <tr><td>Sep 2025</td><td>Series K</td><td class="num">~$1B</td><td class="num">&gt;$100B</td><td>~20× oversubscribed</td></tr>
      <tr><td>16 Dec 2025</td><td>Series L</td><td class="num">&gt;$4B</td><td class="num">$134B</td><td>Insight Partners, Fidelity, J.P. Morgan AM</td></tr>
      <tr><td>Jan 2026</td><td>Debt</td><td class="num">$1.8B</td><td class="num">—</td><td>JPMorgan-led; total debt &amp; investments &gt;$7B</td></tr>
      <tr><td>16 Jul 2026</td><td>Strategic</td><td class="num">~$3B</td><td class="num">$188B</td><td>Coatue-led; term sheet signed, expected to close this summer</td></tr>
    </tbody>
  </table>

  <p>
    The July 2026 round represents an approximate <strong>40% step-up in seven months</strong>.
    Proceeds are directed at Unity AI Gateway (multi-model governance), Genie (AI coworker) and
    Lakebase (serverless Postgres for AI agents).
  </p>

  <div class="alert">
    <div class="t">Valuation basis</div>
    The $188B figure reflects a signed term sheet expected to close during summer 2026. Private
    company valuations are negotiated between issuer and investors — they are not market-clearing
    prices, may not be supported in a public offering, and can be revised downward.
  </div>
</section>

<!-- ══════════════════════════ 4 ══════════════════════════ -->
<section>
  <h2><span class="num">04</span>Financial Performance</h2>

  <table>
    <thead>
      <tr><th>Period</th><th class="num">Revenue run-rate</th><th class="num">YoY growth</th><th>Source of disclosure</th></tr>
    </thead>
    <tbody>
      <tr><td>Dec 2025</td><td class="num">$4.8B</td><td class="num">&gt;55%</td><td>Series L announcement</td></tr>
      <tr><td>Feb 2026</td><td class="num">$5.4B</td><td class="num">&gt;65%</td><td>Company press release</td></tr>
      <tr><td>Jun 2026</td><td class="num">$6.9B</td><td class="num">&gt;80%</td><td>Company comments to analysts, via CNBC</td></tr>
    </tbody>
  </table>

  <p>
    Growth <em>accelerated</em> through the period rather than decaying with scale — an unusual
    profile at this revenue level and a central part of the investment case. Supporting quality
    indicators: AI products surpassed a $1B run-rate; the Data Warehousing product surpassed $1B
    within four years of general availability; and net retention has been sustained above 140%.
  </p>
  <p>
    Management has stated the company is <strong>free-cash-flow positive</strong>. This materially
    reduces financing risk and is the reason the IPO decision is discretionary.
  </p>
</section>

<!-- ══════════════════════════ 5 ══════════════════════════ -->
<section>
  <h2><span class="num">05</span>Growth Vectors &amp; Product Strategy</h2>

  <p>
    CEO Ali Ghodsi has publicly framed a path toward becoming a trillion-dollar company through
    three vectors:
  </p>
  <table>
    <thead><tr><th>Vector</th><th>Thesis</th><th>Evidence to date</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Lakebase</strong></td>
        <td>Serverless Postgres for AI agents; attacks the operational database market.</td>
        <td>GA Feb 2026 with autoscaling, Postgres 17, pgvector, up to 8TB per instance. Grew at roughly twice the pace of Data Warehousing in its first six months.</td>
      </tr>
      <tr>
        <td><strong>Agent&nbsp;Bricks</strong></td>
        <td>Enterprise AI agents operating on proprietary customer data.</td>
        <td>Underpinned by the Tecton acquisition — sub-10ms feature serving for fraud, personalisation and real-time inference.</td>
      </tr>
      <tr>
        <td><strong>AI-authored workloads</strong></td>
        <td>Agents, not humans, provision infrastructure.</td>
        <td>Company reports ~80% of Neon databases created automatically by AI agents.</td>
      </tr>
    </tbody>
  </table>

  <h3>Acquisition programme</h3>
  <ul>
    <li><strong>BladeBridge</strong> (Feb 2025) — AI-assisted migration from Snowflake and Teradata.</li>
    <li><strong>Neon</strong> (May 2025, ~$1B) — serverless Postgres; became the Lakebase foundation.</li>
    <li><strong>Tecton</strong> (Aug 2025, ~$900M) — real-time ML feature store.</li>
    <li><strong>Antimatter</strong> and <strong>SiftD</strong> — security capability, supporting the Lakewatch SIEM launch (Mar 2026, private preview).</li>
  </ul>
</section>

<!-- ══════════════════════════ 6 ══════════════════════════ -->
<section class="break">
  <h2><span class="num">06</span>Competitive Position &amp; Partnerships</h2>

  <p>
    Databricks positions itself as model-neutral infrastructure — partnering across frontier model
    providers rather than committing to one:
  </p>
  <ul>
    <li><strong>OpenAI</strong> (Sep 2025) — multi-year partnership valued at over $100M, making
        GPT-5 natively available to Databricks' enterprise base. Reported as OpenAI's first formal
        integration with a business-focused product vendor.</li>
    <li><strong>Google Gemini 3</strong> (Nov 2025) — native, governed availability on-platform.</li>
    <li><strong>Anthropic</strong> — Claude models power Lakewatch threat detection, with early
        users including Adobe, Dropbox and National Australia Bank.</li>
  </ul>

  <p>
    Against Snowflake, Palantir and MongoDB — each strong in a narrower lane — the platform breadth
    argument is what supports the multiple. The cybersecurity entry via Lakewatch expands the
    addressable market but places Databricks against entrenched incumbents in Splunk and Microsoft.
  </p>
</section>

<!-- ══════════════════════════ 7 ══════════════════════════ -->
<section>
  <h2><span class="num">07</span>Path to Liquidity</h2>

  <div class="timeline">
    <div class="tl">
      <div class="d">February 2025</div>
      <div class="b">CEO confirms the company is structurally "IPO-ready" — board, audit and financial reporting in place.</div>
    </div>
    <div class="tl">
      <div class="d">December 2025</div>
      <div class="b">Ghodsi declines to rule out a 2026 listing in a CNBC interview.</div>
    </div>
    <div class="tl">
      <div class="d">January 2026</div>
      <div class="b">$1.8B debt facility led by JPMorgan; total debt and investments exceed $7B.</div>
    </div>
    <div class="tl">
      <div class="d">4 June 2026</div>
      <div class="b"><strong>Position reverses.</strong> Ghodsi tells Bloomberg 2026 is "a terrible year to go public," pointing to 2027 at the earliest. Cited reason: SpaceX, Anthropic and OpenAI absorbing IPO capital and attention.</div>
    </div>
    <div class="tl">
      <div class="d">16 July 2026</div>
      <div class="b">$188B strategic round led by Coatue — private capital raised in place of a listing.</div>
    </div>
    <div class="tl">
      <div class="d">Ahead</div>
      <div class="b">No S-1 has been publicly filed and no confidential filing has been announced. A confidential filing typically precedes a public listing by 6–12 months, and a public S-1 by roughly 30–45 days.</div>
    </div>
  </div>

  <h3>Indicators to monitor</h3>
  <ul>
    <li>Confidential or public S-1 filing — check the SEC EDGAR database directly.</li>
    <li>Lead underwriter mandates (historically Goldman Sachs, Morgan Stanley or JPMorgan for technology mega-offerings).</li>
    <li>Absorption of the 2026 mega-IPO pipeline, which is the CEO's stated reason for waiting.</li>
    <li>Continued run-rate disclosures and any change in the free-cash-flow position.</li>
  </ul>
</section>

<!-- ══════════════════════════ 8 ══════════════════════════ -->
<section>
  <h2><span class="num">08</span>Investment Considerations</h2>

  <div class="two">
    <div class="panel opp">
      <h4>Supporting the case</h4>
      <ul>
        <li><strong>Accelerating growth at scale</strong> — 55% → 65% → 80% YoY through 2026.</li>
        <li><strong>High-quality revenue</strong> — subscription model, &gt;140% net retention, 80%+ gross margin.</li>
        <li><strong>Free cash flow positive</strong> — no financing dependency.</li>
        <li><strong>Platform breadth</strong> — consolidation of data engineering, warehousing, ML and BI.</li>
        <li><strong>Model neutrality</strong> — partnerships across OpenAI, Google and Anthropic.</li>
        <li><strong>Institutional validation</strong> — Insight, Fidelity, J.P. Morgan AM, Coatue, a16z, BlackRock, Temasek, GIC.</li>
      </ul>
    </div>
    <div class="panel risk">
      <h4>Weighing against</h4>
      <ul>
        <li><strong>Extended and uncertain holding period</strong> — no listing before 2027 on current guidance, and no filing has been made.</li>
        <li><strong>Valuation risk</strong> — $188B is a negotiated private mark, not a market-clearing price.</li>
        <li><strong>Sector de-rating</strong> — software multiples compressed sharply during 2026; a listing may price conservatively against the private mark.</li>
        <li><strong>Illiquidity</strong> — secondary interests are hard to exit and access is not guaranteed.</li>
        <li><strong>Competitive intensity</strong> — hyperscalers, Snowflake, and entrenched incumbents in the new security segment.</li>
        <li><strong>Execution and key-person risk</strong> — including AI leadership transition following Naveen Rao's departure in September 2025.</li>
        <li><strong>Economic sensitivity</strong> — enterprise technology budgets contract in downturns.</li>
      </ul>
    </div>
  </div>
</section>

<!-- ══════════════════════════ 9 ══════════════════════════ -->
<section class="break">
  <h2><span class="num">09</span>Routes to Exposure</h2>

  <p>
    Databricks equity is not publicly traded. The routes below are described for information only;
    availability, eligibility and pricing vary and none is guaranteed.
  </p>

  <table>
    <thead><tr><th>Route</th><th>Eligibility</th><th>Principal considerations</th></tr></thead>
    <tbody>
      <tr>
        <td><strong>Secondary marketplaces</strong><br>(e.g. EquityZen, Forge Global, Hiive)</td>
        <td>Accredited investors</td>
        <td>Purchases of existing employee or early-investor interests. Pricing is negotiated and may diverge materially from the primary round mark. Allocations are intermittent. Transfer restrictions and issuer consent may apply.</td>
      </tr>
      <tr>
        <td><strong>Pooled vehicles</strong><br>(e.g. funds holding private positions)</td>
        <td>Varies by vehicle</td>
        <td>Lower minimums, but exposure is indirect and diluted by other holdings. Fee layering and vehicle-level lock-ups apply.</td>
      </tr>
      <tr>
        <td><strong>Indirect public proxies</strong></td>
        <td>All investors</td>
        <td>Listed shareholders and partners (e.g. Microsoft, NVIDIA) carry only fractional, heavily diluted exposure. Not a substitute for direct exposure.</td>
      </tr>
    </tbody>
  </table>

  <div class="alert">
    <div class="t">Before proceeding</div>
    Private placements and secondary transactions are restricted, illiquid and may result in total
    loss. Minimum investment requirements apply. Secondary pricing does not predict any future
    listing price. Eligibility must be verified, and each opportunity assessed on its own documents.
    Discuss suitability with your {FIRM["legal_name"]} representative and your own tax and legal advisers.
  </div>
</section>

<!-- ══════════════════════════ 10 ══════════════════════════ -->
<section>
  <h2><span class="num">10</span>Sources</h2>
  <p>All figures are drawn from company disclosures and reputable financial media, as follows:</p>
  <ol class="src">
    <li>Databricks — <em>Raising a Strategic Round of Funding at a $188 Billion Valuation</em> (Jul 2026). databricks.com/company/newsroom/press-releases/databricks-raising-strategic-round-funding-188-billion-valuation</li>
    <li>Bloomberg — <em>Coatue Leads Databricks Funding Round at $188 Billion Valuation</em> (17 Jul 2026). bloomberg.com/news/articles/2026-07-17/coatue-leads-databricks-funding-round-at-188-billion-valuation</li>
    <li>Bloomberg — <em>Databricks CEO Plans to Avoid IPO During Year of Huge Offerings</em> (4 Jun 2026). bloomberg.com/news/articles/2026-06-04/databricks-ceo-plans-to-avoid-ipo-during-year-of-huge-offerings</li>
    <li>Databricks — <em>Grows &gt;55% YoY, Surpasses $4.8B Revenue Run-Rate, Raising &gt;$4B Series L at $134B Valuation</em> (16 Dec 2025). databricks.com/company/newsroom/press-releases/databricks-surpasses-4-8b-revenue-run-rate-growing-55-year-over-year</li>
    <li>Databricks — <em>Grows &gt;65% YoY, Surpasses $5.4 Billion Revenue Run-Rate, Doubles Down on Lakebase and Genie</em> (Feb 2026). databricks.com/company/newsroom/press-releases/databricks-grows-65-yoy-surpasses-5-4-billion-revenue-run-rate</li>
    <li>CNBC — <em>Databricks raises capital at $134 billion valuation in latest funding round</em> (16 Dec 2025). cnbc.com/2025/12/16/databricks-funding-valuation.html</li>
    <li>TechCrunch — <em>Databricks hits $188B valuation, extending its run as AI's favorite second act</em> (17 Jul 2026). techcrunch.com/2026/07/17/databricks-hits-188b-valuation-extending-its-run-as-ais-favorite-second-act/</li>
    <li>TechCrunch — <em>Databricks raises $4B at $134B valuation as its AI business heats up</em> (16 Dec 2025). techcrunch.com/2025/12/16/databricks-raises-4b-at-134b-valuation-as-its-ai-business-heats-up/</li>
    <li>Reuters (via TradingView) — <em>Databricks secures funding round at $188 billion valuation</em> (Jul 2026).</li>
    <li>Inc. — <em>"A Terrible Year to Go Public": Why This Massive AI Startup Is Resisting the IPO Rush</em> (Jun 2026).</li>
    <li>U.S. Securities and Exchange Commission — EDGAR full-text search, for filing status verification. sec.gov/edgar/search/</li>
  </ol>
</section>

<!-- ══════════════════════════ 11 ══════════════════════════ -->
<section>
  <h2><span class="num">11</span>Important Disclosures</h2>
  <div class="disclaimer">
    <p>
      <strong>Not an offer.</strong> This document is provided by {FIRM["legal_name"]} for
      informational and discussion purposes only. It does not constitute an offer to sell, a
      solicitation of an offer to buy, or a recommendation regarding any security, nor does it
      constitute investment, legal, accounting or tax advice. Any offer of securities would be made
      only pursuant to definitive offering documents containing complete information about the
      terms, risks and conflicts of interest, which must be read in full.
    </p>
    <p>
      <strong>No affiliation.</strong> {FIRM["legal_name"]} is not affiliated with, endorsed by, or
      acting on behalf of Databricks, Inc. Databricks has not reviewed, approved or verified this
      document. All trademarks are the property of their respective owners.
    </p>
    <p>
      <strong>Information and sources.</strong> Information is current as of {AS_OF} and is derived
      from public company announcements and third-party media identified in Section 10.
      {FIRM["legal_name"]} has not independently verified third-party information and makes no
      representation or warranty as to its accuracy or completeness. Private company financial data
      is not audited to public-company standards and is not subject to SEC reporting requirements.
      Conditions change rapidly: the subject company's valuation and stated listing intentions both
      changed materially within the six months preceding this document.
    </p>
    <p>
      <strong>Forward-looking statements.</strong> Statements regarding future events — including any
      listing timing, valuation, revenue or market conditions — are forward-looking, inherently
      uncertain and subject to change without notice. They are not guarantees. Actual outcomes may
      differ materially. No projection, target or third-party analyst estimate should be relied upon
      as a prediction of actual results.
    </p>
    <p>
      <strong>Risk of loss.</strong> Investing in private, pre-IPO and secondary interests involves a
      high degree of risk, including the <strong>total loss of capital</strong>. Such interests are
      illiquid, may not be transferable, may be subject to issuer consent and lock-ups, and there is
      no assurance any liquidity event will occur or occur at a particular valuation. Private
      valuations are negotiated and may not be realisable. Past performance and prior funding
      valuations do not indicate future results. These interests are generally available only to
      accredited investors or equivalent qualified persons, and are not suitable for all investors.
    </p>
    <p>
      <strong>Suitability.</strong> This material does not take into account the objectives, financial
      situation or needs of any particular person. Recipients should conduct their own due diligence
      and consult qualified independent financial, legal and tax advisers before making any
      investment decision.
    </p>
    <p>
      <strong>Confidentiality.</strong> This document is confidential, intended solely for the named
      recipient, and may not be reproduced or distributed without the prior written consent of
      {FIRM["legal_name"]}.
    </p>
    <p style="margin-top:4mm; padding-top:3mm; border-top:1px solid var(--line);">
      <strong>{FIRM["legal_name"]}</strong> ·
      <span class="ph">{FIRM["registration"]}</span> ·
      <span class="ph">{FIRM["crd"]}</span><br>
      <span class="ph">{FIRM["address"]}</span> ·
      <span class="ph">{FIRM["phone"]}</span> ·
      <span class="ph">{FIRM["email"]}</span> ·
      <span class="ph">{FIRM["website"]}</span><br>
      © 2026 {FIRM["legal_name"]}. All rights reserved.
    </p>
  </div>
</section>

</body>
</html>
"""

out = HERE / "databricks-overview.html"
out.write_text(HTML, encoding="utf-8")
print(f"wrote {out}  ({len(HTML):,} chars)")
