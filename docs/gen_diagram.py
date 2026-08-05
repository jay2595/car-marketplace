import sys
sys.path.insert(0, '/sessions/friendly-ecstatic-darwin/mnt/outputs/build')
from gen_icons import icon

W, H = 1760, 1332
o = []
def a(s): o.append(s)
def esc(t): return t.replace('&','&amp;').replace('<','&lt;').replace('>','&gt;')
def txt(x, y, t, cls="t", anchor="start", extra=""):
    return f'<text class="{cls}" x="{x:g}" y="{y:g}" text-anchor="{anchor}"{extra}>{esc(t)}</text>'
def arrow_r(x1, y, x2, color, w=2.0):   # left -> right
    a(f'<line x1="{x1}" y1="{y}" x2="{x2-5}" y2="{y}" stroke="{color}" stroke-width="{w}"/>')
    a(f'<polygon points="{x2-6},{y-4} {x2-6},{y+4} {x2},{y}" fill="{color}"/>')
def arrow_l(x1, y, x2, color, w=2.0):   # right -> left
    a(f'<line x1="{x1}" y1="{y}" x2="{x2+5}" y2="{y}" stroke="{color}" stroke-width="{w}"/>')
    a(f'<polygon points="{x2+6},{y-4} {x2+6},{y+4} {x2},{y}" fill="{color}"/>')
def arrow_d(x, y1, y2, color, w=2.0):
    a(f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2-5}" stroke="{color}" stroke-width="{w}"/>')
    a(f'<polygon points="{x-4},{y2-6} {x+4},{y2-6} {x},{y2}" fill="{color}"/>')
def arrow_u(x, y1, y2, color, w=2.0):
    a(f'<line x1="{x}" y1="{y1}" x2="{x}" y2="{y2+5}" stroke="{color}" stroke-width="{w}"/>')
    a(f'<polygon points="{x-4},{y2+6} {x+4},{y2+6} {x},{y2}" fill="{color}"/>')

NAVY, GREEN, RED, BLUE, MUTED = "#1F3864", "#2E9E4F", "#D93025", "#2E75B6", "#6B6558"

def pill(xr, y, label, w=None):
    """Stage tag anchored so its RIGHT edge sits at xr."""
    w = w if w else 7 + len(label)*4.6
    a(f'<rect x="{xr-w:g}" y="{y}" width="{w:g}" height="17" rx="8.5" fill="#EAF2FB" stroke="#9DC3E6" stroke-width="1"/>')
    a(f'<text x="{xr-w/2:g}" y="{y+11.6}" text-anchor="middle" font-size="6.8" font-weight="700" fill="#1F3864" letter-spacing=".4">{esc(label)}</text>')

a(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" role="img" aria-labelledby="ti de">')
a('<title id="ti">DevSecOps pipeline for a Node.js application deployed to AKS, with quality and security gates.</title>')
a('<desc id="de">A GitHub push fires a webhook that starts a Jenkins pipeline of nine steps and five gates: checkout, build and test, test gate, SonarQube analysis, quality gate, Trivy filesystem scan, dependency gate, Docker build, Trivy image scan, image security gate, push to ACR, Helm deploy, deployment gate, verify. Below, the Azure Cloud zone shows the Jenkins VM, SonarQube server, Azure Container Registry, and an AKS cluster containing the NGINX ingress controller, service, application deployment pods, and workload configuration, fronted by an Azure Load Balancer that users reach over HTTPS.</desc>')
a('''<style>
svg{font-family:ui-sans-serif,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;}
.pg{fill:#fff}
.h1{font-size:23px;font-weight:700;fill:#1F3864;letter-spacing:.3px}
.h2{font-size:14px;font-weight:600;fill:#404040}
.band{fill:#F4F9FE;stroke:#9DC3E6;stroke-width:1.4}
.bandhd{fill:#DCE9F7}
.bt{font-size:13.5px;font-weight:700;fill:#1F3864}
.card{fill:#fff;stroke:#B9CDE5;stroke-width:1.2}
.cardhd{fill:#EAF2FB}
.gate{fill:#fff;stroke:#2E9E4F;stroke-width:1.6}
.gatehd{fill:#E4F3E8}
.ct{font-size:8.6px;font-weight:700;fill:#1F3864}
.gt{font-size:8.6px;font-weight:700;fill:#1E7B3C}
.bl{font-size:7.4px;fill:#4A4A4A}
.q{font-size:7.8px;font-weight:600;fill:#333}
.yes{font-size:9px;font-weight:700;fill:#2E9E4F}
.no{font-size:9px;font-weight:700;fill:#D93025}
.stopt{font-size:7.2px;font-weight:700;fill:#D93025}
.box{fill:#fff;stroke:#B9B4A8;stroke-width:1.2}
.t{font-size:9.5px;fill:#2B2A27}
.tb{font-size:10px;font-weight:700;fill:#1F3864}
.ts{font-size:8px;fill:#6B6558}
.tm{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:7.6px;fill:#4A4A4A}
.zl{font-size:11px;font-weight:700;fill:#2E75B6;letter-spacing:1px}
.sl{font-size:8.5px;font-weight:700;fill:#7A5A10;letter-spacing:.8px}
.azzone{fill:#F6FBFF;stroke:#2E75B6;stroke-width:1.4;stroke-dasharray:7 4}
.akszone{fill:#FBF8FF;stroke:#7030A0;stroke-width:1.4;stroke-dasharray:6 4}
.credzone{fill:#FDF8EC;stroke:#E0A030;stroke-width:1.4;stroke-dasharray:6 4}
.infobox{fill:#F7F9FB;stroke:#B9CDE5;stroke-width:1.2}
.chip{fill:#FBFCFD;stroke:#C9D6E4;stroke-width:1}
.ben{fill:#F2FAF4;stroke:#2E9E4F;stroke-width:1.3}
.benhd{fill:#2E9E4F}
</style>''')
a(f'<rect class="pg" width="{W}" height="{H}"/>')

# ---------------- header ----------------
a(txt(W/2, 36, "DEVSECOPS PIPELINE FOR NODE.JS APPLICATION DEPLOYMENT TO AKS", "h1", "middle"))
a(txt(W/2, 60, "WITH QUALITY & SECURITY GATES", "h2", "middle"))

# ---------------- left column ----------------
def simple_box(x, y, w, h, ic, icsz, title, sub, ty=None):
    a(f'<rect class="box" x="{x}" y="{y}" width="{w}" height="{h}" rx="7"/>')
    a(icon(ic, x + w/2 - icsz/2, y + 14, icsz))
    a(txt(x + w/2, y + icsz + 32, title, "tb", "middle"))
    if sub: a(txt(x + w/2, y + icsz + 46, sub, "ts", "middle"))

simple_box(24, 96, 126, 96, "dev", 30, "DEVELOPER", "writes code")
arrow_d(87, 192, 206, "#555")
a(txt(92, 202, "git push", "ts"))
simple_box(24, 218, 126, 96, "github", 30, "GITHUB", "repository")
arrow_d(87, 314, 328, "#555")
simple_box(24, 340, 126, 90, "webhook", 28, "WEBHOOK", "automatic trigger")

# webhook -> pipeline
a(f'<path d="M150 385 H168 V250 H186" fill="none" stroke="#555" stroke-width="2" stroke-dasharray="6 4"/>')
a(f'<polygon points="184,246 184,254 190,250" fill="#555"/>')


# ---------------- pipeline band ----------------
BX, BY, BW, BH = 176, 88, 1560, 376
a(f'<rect class="band" x="{BX}" y="{BY}" width="{BW}" height="{BH}" rx="9"/>')
a(f'<path class="bandhd" d="M{BX+1} {BY+1} h{BW-2} v27 h{-(BW-2)} z"/>')
a(txt(BX + BW/2, BY + 20, "JENKINS PIPELINE   (declarative, running on the Ubuntu Jenkins VM)", "bt", "middle"))

CT, CB = 124, 374          # card top / bottom
steps = [
 ("1. CHECKOUT",              "git",    ["Clone repo from GitHub", "Read commit SHA", "Tag build BUILD-SHA"]),
 ("2. BUILD & TEST",          "node",   ["npm ci", "npm test + coverage", "Archive lcov report"]),
 ("3. SONARQUBE ANALYSIS",    "sonar",  ["Code quality scan", "Bugs & code smells", "Coverage analysis"]),
 ("4. TRIVY FILESYSTEM SCAN", "trivy",  ["Scan package-lock.json", "Dependency CVEs", "Hardcoded secrets"]),
 ("5. BUILD DOCKER IMAGE",    "docker", ["Multi-stage build", "Non-root runtime", "Tag BUILD_NUMBER-SHA"]),
 ("6. TRIVY IMAGE SCAN",      "trivy",  ["Scan OS + app layers", "--ignore-unfixed", "Archive JSON report"]),
 ("7. PUSH TO ACR",           "acr",    ["Login to ACR", "Push approved image", "Unique immutable tag"]),
 ("8. DEPLOY WITH HELM",      "helm",   ["az aks get-credentials", "helm lint + template", "helm upgrade --atomic"]),
 ("9. VERIFY DEPLOYMENT",     "aks",    ["Pods / Deploy / Service", "Ingress / HPA", "helm test smoke check"]),
]
gates = {
 2: ("GATE 1", "TEST GATE",         ["All unit tests", "passed?"]),
 3: ("GATE 2", "QUALITY GATE",      ["SonarQube gate", "green?"]),
 4: ("GATE 3", "DEPENDENCY",     ["No CRITICAL CVE", "or secret?"]),
 6: ("GATE 4", "IMAGE SCAN",        ["Image approved", "for release?"]),
 8: ("GATE 5", "DEPLOYMENT",        ["Rollout healthy", "and Ready?"]),
}
SW, GW, GAP = 108, 82, 12
x = 190
placed = []
for i, (title, ic, bullets) in enumerate(steps, start=1):
    a(f'<rect class="card" x="{x}" y="{CT}" width="{SW}" height="{CB-CT}" rx="5"/>')
    a(f'<path class="cardhd" d="M{x+1} {CT+1} h{SW-2} v33 h{-(SW-2)} z"/>')
    a(f'<line x1="{x+1}" y1="{CT+34}" x2="{x+SW-1}" y2="{CT+34}" stroke="#B9CDE5"/>')
    words = title.split(" ")
    l1 = words[0] + " " + words[1] if len(words) > 1 else title
    l2 = " ".join(words[2:])
    if not l2: a(txt(x+SW/2, CT+22, l1, "ct", "middle"))
    else:
        a(txt(x+SW/2, CT+15, l1, "ct", "middle")); a(txt(x+SW/2, CT+27, l2, "ct", "middle"))
    a(icon(ic, x+SW/2-19, CT+46, 38))
    for j, b in enumerate(bullets):
        a(txt(x+8, CT+108+j*15, "• " + b, "bl"))
    placed.append(("S", x, SW))
    x += SW + GAP
    if i in gates:
        g1, g2, q = gates[i]
        a(f'<rect class="gate" x="{x}" y="{CT}" width="{GW}" height="{CB-CT}" rx="5"/>')
        a(f'<path class="gatehd" d="M{x+1.4} {CT+1.4} h{GW-2.8} v33 h{-(GW-2.8)} z"/>')
        a(f'<line x1="{x+1.4}" y1="{CT+34}" x2="{x+GW-1.4}" y2="{CT+34}" stroke="#2E9E4F"/>')
        a(txt(x+GW/2, CT+15, g1, "gt", "middle")); a(txt(x+GW/2, CT+27, g2, "gt", "middle"))
        a(icon("check", x+GW/2-16, CT+46, 32))
        a(txt(x+GW/2, CT+96, q[0], "q", "middle")); a(txt(x+GW/2, CT+108, q[1], "q", "middle"))
        a(txt(x+GW/2, CT+150, "YES", "yes", "middle"))
        arrow_d(x+GW/2, CT+156, CT+178, GREEN, 1.8)
        a(txt(x+GW/2, CT+204, "NO", "no", "middle"))
        placed.append(("G", x, GW))
        # red drop to STOP
        arrow_d(x+GW/2, CB, CB+12, RED, 1.8)
        a(icon("stop", x+GW/2-19, CB+14, 38))
        a(txt(x+GW/2, CB+66, "STOP", "stopt", "middle"))
        a(txt(x+GW/2, CB+76, "PIPELINE", "stopt", "middle"))
        x += GW + GAP

# green connectors between every card
for k in range(len(placed)-1):
    _, px, pw = placed[k]
    _, nx, _ = placed[k+1]
    arrow_r(px+pw+1, 250, nx-1, GREEN, 1.8)
# entry arrow already drawn from webhook

# ---------------- credentials / vm tools / webhooks row ----------------
RY, RH = 486, 112
a(f'<rect class="credzone" x="176" y="{RY}" width="690" height="{RH}" rx="8"/>')
a(txt(194, RY+20, "JENKINS CREDENTIALS  (Credentials Manager — nothing hardcoded in the Jenkinsfile)", "sl"))
creds = [("github","github-credentials","Username + PAT"),
         ("sonar","sonarqube-token","Secret text"),
         ("azure","azure-service-principal","Username + password"),
         ("azure","azure-tenant-id","Secret text"),
         ("azure","azure-subscription-id","Secret text"),
         ("acr","acr-credentials","Username + password")]
for i,(ic,idn,kind) in enumerate(creds):
    cx = 194 + (i%3)*228; cy = RY+32 + (i//3)*38
    a(icon(ic, cx, cy, 18))
    a(txt(cx+24, cy+9, idn, "tm"))
    a(txt(cx+24, cy+19, kind, "ts"))

a(f'<rect class="infobox" x="886" y="{RY}" width="428" height="{RH}" rx="8"/>')
a(txt(904, RY+20, "INSTALLED ON THE JENKINS VM  (tools, not credentials)", "sl", extra=' fill="#1F3864"'))
tools = [("java","Java 17 (JDK)"),("jenkins","Jenkins LTS"),("docker","Docker Engine"),
         ("node","Node.js 20"),("azure","Azure CLI"),("k8s","kubectl"),
         ("helm","Helm 3"),("trivy","Trivy"),("sonar","sonar-scanner")]
for i,(ic,nm) in enumerate(tools):
    cx = 904 + (i%3)*140; cy = RY+32 + (i//3)*26
    a(icon(ic, cx, cy, 16))
    a(txt(cx+21, cy+12, nm, "ts"))

a(f'<rect class="infobox" x="1334" y="{RY}" width="402" height="{RH}" rx="8" stroke="#E0A030"/>')
a(txt(1352, RY+20, "WEBHOOKS — BOTH ARE REQUIRED", "sl"))
a(icon("github", 1352, RY+30, 15))
a(txt(1373, RY+40, "GitHub → Jenkins   /github-webhook/", "tm"))
a(txt(1373, RY+51, "starts the pipeline on every push to main", "ts"))
a(icon("sonar", 1352, RY+62, 15))
a(txt(1373, RY+72, "SonarQube → Jenkins   /sonarqube-webhook/", "tm"))
a(txt(1373, RY+83, "returns the Quality Gate verdict", "ts"))
a(txt(1352, RY+100, "Without the second one, GATE 2 hangs until timeout.", "ts", extra=' fill="#C0504D"'))

# ---------------- azure cloud zone ----------------
ZY, ZH = 614, 396
a(f'<rect class="azzone" x="24" y="{ZY}" width="1712" height="{ZH}" rx="10"/>')
a(icon("azure", 42, ZY+14, 22))
a(txt(72, ZY+31, "AZURE CLOUD", "zl"))

# identity connector from the pipeline band down to the VM that runs it
a('<path d="M176 445 H142 V654" fill="none" stroke="#7030A0" stroke-width="1.8" stroke-dasharray="2 3"/>')
a('<polygon points="138,654 146,654 142,662" fill="#7030A0"/>')
a(txt(30, 534, "Everything in the band", "ts", extra=' fill="#7030A0" font-weight="700"'))
a(txt(30, 546, "above executes on this", "ts", extra=' fill="#7030A0" font-weight="700"'))
a(txt(30, 558, "one Jenkins VM.", "ts", extra=' fill="#7030A0" font-weight="700"'))

# Jenkins VM
a(f'<rect class="box" x="44" y="662" width="170" height="140" rx="7"/>')
a(icon("ubuntu", 58, 676, 26)); a(icon("jenkins", 90, 676, 26))
pill(206, 668, 'RUNS ALL 9 STAGES')
a(txt(58, 726, "JENKINS VM", "tb"))
a(txt(58, 740, "Ubuntu 22.04 · Azure VM", "ts"))
a(txt(58, 758, "• Runs the pipeline", "bl"))
a(txt(58, 772, "• Builds + scans images", "bl"))
a(txt(58, 786, "• Holds the kubeconfig", "bl"))

# SonarQube server
a(f'<rect class="box" x="44" y="818" width="170" height="142" rx="7"/>')
a(icon("sonar", 58, 832, 26))
pill(206, 824, 'STAGE 3 + GATE 2')
a(txt(58, 882, "SONARQUBE SERVER", "tb"))
a(txt(58, 896, "Docker container on the", "ts"))
a(txt(58, 908, "Jenkins VM · port 9000", "ts"))
a(txt(58, 926, "• Quality Gate rules", "bl"))
a(txt(58, 940, "• Webhook back to Jenkins", "bl"))

# ACR
a(f'<rect class="box" x="258" y="662" width="200" height="298" rx="7"/>')
a(icon("acr", 268, 676, 30))
pill(450, 668, 'TARGET OF STAGE 7')
a(txt(268, 726, "AZURE CONTAINER", "tb")); a(txt(268, 740, "REGISTRY (ACR)", "tb"))
a(txt(268, 760, "• Private image registry", "bl"))
a(txt(268, 776, "• Only gate-approved", "bl")); a(txt(276, 789, "images are pushed", "bl"))
a(txt(268, 805, "• Attached to AKS with", "bl")); a(txt(276, 818, "a managed identity", "bl"))
a(txt(268, 834, "• No imagePullSecret", "bl")); a(txt(276, 847, "needed in the chart", "bl"))
a(txt(268, 872, "Image tag", "ts"))
a(txt(268, 886, "car-marketplace:", "tm")); a(txt(268, 898, "  <BUILD_NUMBER>-<SHA>", "tm"))
a(txt(268, 922, "• Traceable to a commit", "bl"))
a(txt(268, 938, "• Enables Helm rollback", "bl"))

# AKS zone
AX, AY, AW, AH = 472, 662, 830, 298
a(f'<rect class="akszone" x="{AX}" y="{AY}" width="{AW}" height="{AH}" rx="9"/>')
a(icon("aks", AX+16, AY+12, 24))
a(txt(AX+48, AY+24, "AZURE KUBERNETES SERVICE (AKS)", "zl", extra=' fill="#7030A0"'))
pill(AX+AW-16, AY+8, 'TARGET OF STAGES 8 & 9')
a(txt(AX+48, AY+38, "cluster aks-car-marketplace · namespace car-marketplace · metrics-server enabled", "ts"))

# Deployment
a(f'<rect class="card" x="502" y="716" width="310" height="100" rx="6"/>')
a(icon("k8s", 512, 724, 16))
a(txt(534, 736, "Deployment — Node.js Car Marketplace", "t", extra=' font-weight="600"'))
for i in range(3):
    px = 514 + i*100
    a(f'<rect class="chip" x="{px}" y="{748}" width="92" height="56" rx="5"/>')
    a(icon("pod", px+8, 760, 18))
    a(txt(px+32, 772, "pod", "ts")); a(txt(px+32, 784, ":3000", "ts"))
# Service
a(f'<rect class="card" x="832" y="716" width="170" height="100" rx="6"/>')
a(icon("k8s", 917-11, 730, 22))
a(txt(917, 776, "Service", "t", "middle", ' font-weight="600"'))
a(txt(917, 790, "ClusterIP  80 → 3000", "ts", "middle"))
# Ingress controller
a(f'<rect class="card" x="1022" y="716" width="260" height="100" rx="6"/>')
a(icon("nginx", 1034, 728, 24))
a(txt(1064, 740, "NGINX Ingress Controller", "t", extra=' font-weight="600"'))
a(txt(1034, 762, "• Runs as pods inside the cluster", "bl"))
a(txt(1034, 776, "• TLS termination · host routing", "bl"))
a(txt(1034, 790, "• ingress-nginx namespace", "bl"))
a(txt(1034, 804, "• Its Service is type LoadBalancer", "bl"))

# workload config chips
chips = [("config","ConfigMap + Secret",["APP_ENV · CURRENCY","TAX_RATE · LOG_LEVEL","injected as env vars"]),
         ("gauge","Resource requests","& limits",),
         ("probe","Liveness / Readiness",),
         ("hpa","HorizontalPodAutoscaler",),
         ("shield","PodDisruptionBudget",)]
chip_data = [
 ("config","ConfigMap + Secret", ["APP_ENV · CURRENCY","TAX_RATE · LOG_LEVEL","injected as env vars"]),
 ("gauge","Requests & Limits",   ["requests 100m / 128Mi","limits 500m / 512Mi","required for the HPA"]),
 ("probe","Health Probes",       ["startup · liveness","readiness","/health/live · /ready"]),
 ("hpa","HorizontalPodAutoscaler",["CPU 60% · memory 70%","min 2 · max 10 replicas","scales the Deployment"]),
 ("shield","PodDisruptionBudget",["minAvailable: 1","protects rolling","updates & node drains"]),
]
for i,(ic,nm,lines) in enumerate(chip_data):
    cx = 492 + i*160
    a(f'<rect class="chip" x="{cx}" y="832" width="150" height="108" rx="6"/>')
    a(icon(ic, cx+10, 842, 18))
    a(txt(cx+34, 855, nm, "ts", extra=' font-weight="700" fill="#1F3864"'))
    for j,l in enumerate(lines):
        a(txt(cx+10, 880+j*14, l, "bl"))

# Azure Load Balancer
a(f'<rect class="box" x="1322" y="716" width="180" height="100" rx="7"/>')
a(icon("lb", 1332, 726, 26))
a(txt(1364, 743, "AZURE LOAD", "tb")); a(txt(1364, 755, "BALANCER + PUBLIC IP", "tb"))
a(txt(1332, 776, "• Created automatically by", "bl"))
a(txt(1340, 789, "the ingress-nginx Service", "bl"))
a(txt(1332, 803, "• DNS A record points here", "bl"))

# Users
a(f'<rect class="box" x="1530" y="716" width="186" height="100" rx="7"/>')
a(icon("users", 1608, 728, 30))
a(txt(1623, 776, "END USERS", "tb", "middle"))
a(txt(1623, 792, "browser / mobile client", "ts", "middle"))

# runtime arrows (right -> left)
arrow_l(1530, 766, 1506, "#555")
a(icon("lock", 1509, 726, 14)); a(txt(1518, 722, "HTTPS", "ts", "middle", ' fill="#2E9E4F"'))
arrow_l(1322, 766, 1286, "#555")
arrow_l(1022, 766, 1006, "#555")
arrow_l(832, 766, 816, "#555")
# image pull (left -> right, dashed)
a('<line x1="458" y1="766" x2="492" y2="766" stroke="#7A7568" stroke-width="1.8" stroke-dasharray="5 3"/>')
a('<polygon points="492,762 492,770 498,766" fill="#7A7568"/>')
a(txt(476, 758, "image", "ts", "middle")); a(txt(476, 786, "pull", "ts", "middle"))
# docker push
arrow_r(214, 730, 256, "#555")
a(txt(235, 720, "docker", "ts", "middle")); a(txt(235, 750, "push", "ts", "middle"))
pill(258, 758, "7", 16)
# helm upgrade route
a('<path d="M214 782 H232 V988 H600" fill="none" stroke="#555" stroke-width="2"/>')
a('<polygon points="596,988 604,988 600,982" fill="#555"/>')
a(f'<line x1="600" y1="988" x2="600" y2="966" stroke="#555" stroke-width="2"/>')
a('<polygon points="596,966 604,966 600,958" fill="#555"/>')
a(txt(268, 982, "helm upgrade --install --atomic   then   kubectl verify + helm test   (kubeconfig from az aks get-credentials)", "ts"))
pill(266, 974, "8 & 9", 34)

# ---------------- tools strip ----------------
TY = 1032
a(f'<rect class="infobox" x="24" y="{TY}" width="1712" height="66" rx="8"/>')
a(txt(44, TY+39, "TOOLS & TECHNOLOGIES", "zl", extra=' fill="#1F3864"'))
strip = [("github","GitHub"),("jenkins","Jenkins"),("node","Node.js"),("sonar","SonarQube"),
         ("docker","Docker"),("trivy","Trivy"),("helm","Helm"),("k8s","Kubernetes"),
         ("nginx","NGINX Ingress"),("acr","ACR"),("aks","AKS"),("azure","Azure CLI")]
for i,(ic,nm) in enumerate(strip):
    cx = 272 + i*121
    a(icon(ic, cx, TY+20, 24))
    a(txt(cx+29, TY+37, nm, "ts"))

# ---------------- legend / notes / benefits ----------------
LY, LH = 1122, 186
a(f'<rect class="infobox" x="24" y="{LY}" width="330" height="{LH}" rx="8"/>')
a(txt(42, LY+22, "LEGEND", "sl", extra=' fill="#1F3864"'))
arrow_r(42, LY+40, 78, GREEN, 1.8);  a(txt(88, LY+44, "Pass — continue to next stage", "ts"))
arrow_r(42, LY+62, 78, RED, 1.8);    a(txt(88, LY+66, "Fail — stop the pipeline", "ts"))
a(icon("stop", 48, LY+76, 20));      a(txt(88, LY+90, "Build marked FAILED, nothing ships", "ts"))
a('<line x1="42" y1="'+str(LY+112)+'" x2="78" y2="'+str(LY+112)+'" stroke="#7A7568" stroke-width="1.8" stroke-dasharray="5 3"/>')
a(txt(88, LY+116, "Runtime traffic / image pull", "ts"))
a(f'<rect x="42" y="{LY+128}" width="36" height="14" rx="3" fill="#FDF8EC" stroke="#E0A030" stroke-dasharray="4 3"/>')
a(txt(88, LY+139, "Stored in Jenkins Credentials", "ts"))
pill(78, LY+152, "STAGE 7", 46)
a(txt(88, LY+164, "Which pipeline stage acts on this resource", "ts"))

a(f'<rect class="infobox" x="378" y="{LY}" width="640" height="{LH}" rx="8"/>')
a(txt(396, LY+22, "NOTES", "sl", extra=' fill="#1F3864"'))
notes = [
 "The pipeline halts at the first failing gate — no image is built, pushed or deployed after a failure.",
 "Images are tagged <BUILD_NUMBER>-<GIT_SHA>, which is what makes helm upgrade produce a new pod spec.",
 "Trivy gates run --ignore-unfixed and block on CRITICAL while reporting HIGH+, so unfixable base-image",
 "     CVEs cannot deadlock the build. Accepted CVEs are listed in .trivyignore with a review date.",
 "helm upgrade --atomic --wait automatically rolls back a failed rollout; helm history keeps 10 revisions.",
 "The NGINX ingress controller and the application both run as pods inside AKS — not beside it.",
 "SonarQube runs as a container on the Jenkins VM and must call back to /sonarqube-webhook/.",
]
for i,n in enumerate(notes):
    wrapped = n.startswith("     ")
    a(txt(396 + (10 if wrapped else 0), LY+40+i*16, ("" if wrapped else "• ") + n.strip(), "ts"))

a(f'<rect class="ben" x="1042" y="{LY}" width="694" height="{LH}" rx="8"/>')
a(f'<path class="benhd" d="M1043 {LY+1} h692 v24 h-692 z"/>')
a(txt(1389, LY+18, "KEY BENEFITS", "sl", "middle", ' fill="#ffffff"'))
bens = ["Fully automated CI/CD on every push",
        "Code quality enforced by a Quality Gate",
        "Dependency + secret scanning (Trivy fs)",
        "Container image scanning (Trivy image)",
        "Only approved images ever reach ACR",
        "Infrastructure as code with a Helm chart",
        "Auto-scaling (HPA) + health probes",
        "Atomic deploys with one-command rollback",
        "Traceable builds: tag → commit → release",
        "Zero secrets stored in the repository"]
for i,b in enumerate(bens):
    cx = 1058 + (i//5)*348; cy = LY+46 + (i%5)*22
    a(txt(cx, cy, "✓", "ts", extra=' fill="#2E9E4F" font-weight="700" font-size="10"'))
    a(txt(cx+16, cy, b, "ts"))

a('</svg>')
open('/sessions/friendly-ecstatic-darwin/mnt/outputs/car-marketplace/docs/architecture-gated.svg','w').write("\n".join(o))
print("written")
