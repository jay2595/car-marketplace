import math

def octagon(cx, cy, r):
    pts = []
    for k in range(8):
        a = math.radians(22.5 + 45*k)
        pts.append(f"{cx + r*math.cos(a):.2f},{cy + r*math.sin(a):.2f}")
    return " ".join(pts)

ICONS = {
"github": (16, '<path fill="#181717" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/>'),

"dev": (24, '<circle cx="12" cy="7.5" r="4.2" fill="#3E6DA8"/><path d="M3.5 21.5c0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5z" fill="#3E6DA8"/>'),

"users": (24, '<circle cx="8.5" cy="7" r="3.6" fill="#3E6DA8"/><path d="M1.5 20c0-3.9 3.1-7 7-7s7 3.1 7 7z" fill="#3E6DA8"/><circle cx="17.5" cy="8.5" r="3" fill="#7FA6D4"/><path d="M12.5 20c0-3 2.4-5.5 5-5.5s5 2.5 5 5.5z" fill="#7FA6D4"/>'),

"webhook": (24, '<circle cx="12" cy="12" r="10.5" fill="none" stroke="#C0504D" stroke-width="1.6"/><circle cx="8" cy="9" r="2.6" fill="#C0504D"/><circle cx="16.5" cy="10.5" r="2.6" fill="#C0504D"/><circle cx="11.5" cy="18" r="2.6" fill="#C0504D"/><path d="M9.6 11.2 10.8 15.6M14.4 12.4 13.6 16.2M10.2 8.2l4.2 1" stroke="#C0504D" stroke-width="1.5" fill="none"/>'),

"jenkins": (24, '<rect width="24" height="24" rx="5" fill="#D33833"/><ellipse cx="12" cy="7.6" rx="6.2" ry="1.5" fill="#fff"/><path d="M8.2 7.6V5.4c0-1.1 1.7-2 3.8-2s3.8.9 3.8 2v2.2z" fill="#fff"/><circle cx="12" cy="12" r="3.6" fill="#fff"/><path d="M5.5 22c0-3.1 2.9-5.6 6.5-5.6S18.5 18.9 18.5 22z" fill="#fff"/><path d="M9.8 16.9 12 18.4l2.2-1.5v3.2L12 18.6l-2.2 1.5z" fill="#D33833"/>'),

"ubuntu": (24, '<circle cx="12" cy="12" r="10.5" fill="#E95420"/><circle cx="6.6" cy="12" r="2.5" fill="#fff"/><circle cx="14.7" cy="6.4" r="2.5" fill="#fff"/><circle cx="14.7" cy="17.6" r="2.5" fill="#fff"/><g stroke="#fff" stroke-width="1.5"><path d="M8.6 10.9 12.9 7.9M8.6 13.1l4.3 3"/></g>'),

"node": (24, '<path d="M12 1.6 21.2 6.8v10.4L12 22.4 2.8 17.2V6.8z" fill="#339933"/><text x="12" y="15.6" font-family="sans-serif" font-size="8.5" font-weight="700" fill="#fff" text-anchor="middle">JS</text>'),

"docker": (24, '<g fill="#2496ED"><rect x="4.2" y="10" width="3.1" height="3.1" rx=".4"/><rect x="7.9" y="10" width="3.1" height="3.1" rx=".4"/><rect x="11.6" y="10" width="3.1" height="3.1" rx=".4"/><rect x="7.9" y="6.3" width="3.1" height="3.1" rx=".4"/><rect x="11.6" y="6.3" width="3.1" height="3.1" rx=".4"/><rect x="11.6" y="2.6" width="3.1" height="3.1" rx=".4"/><path d="M2 14.2h18.4c.2 2-.6 3.6-2.2 4.7-1.7 1.1-4 1.6-6.8 1.6-3.3 0-5.9-.9-7.7-2.6A7.7 7.7 0 0 1 2 14.2z"/><path d="M17.4 11.6c.9-.7 1.6-1.4 2-2.1l1.5 1.4c-.4.9-1.2 1.7-2.3 2.4z"/></g>'),

"sonar": (24, '<g fill="none" stroke="#4E9BCD" stroke-width="2.4" stroke-linecap="round"><path d="M4 16.6a5.6 5.6 0 0 1 5.6 5.6"/><path d="M4 10.4a11.8 11.8 0 0 1 11.8 11.8"/><path d="M4 4.2a18 18 0 0 1 18 18"/></g>'),

"trivy": (24, '<path d="M12 1.6 21 5.4v6.2c0 5.1-3.7 9.3-9 10.8-5.3-1.5-9-5.7-9-10.8V5.4z" fill="#1904DA"/><circle cx="10.6" cy="10.3" r="3.3" fill="none" stroke="#fff" stroke-width="1.7"/><path d="m13.2 12.9 3.1 3.1" stroke="#fff" stroke-width="1.9" stroke-linecap="round"/>'),

"helm": (24, '<circle cx="12" cy="12" r="7.4" fill="none" stroke="#0F1689" stroke-width="2"/><circle cx="12" cy="12" r="2.4" fill="#0F1689"/><g stroke="#0F1689" stroke-width="1.7" stroke-linecap="round"><path d="M12 4.6V1.8M12 22.2v-2.8M19.4 12h2.8M1.8 12h2.8M17.2 6.8l2-2M4.8 19.2l2-2M17.2 17.2l2 2M4.8 4.8l2 2"/></g>'),

"k8s": (24, '<polygon points="12,2 19.82,5.77 21.75,14.22 16.34,21.01 7.66,21.01 2.25,14.22 4.18,5.77" fill="#326CE5"/><g stroke="#fff" stroke-width="1.35" stroke-linecap="round"><path d="M12 12V5.2M12 12l5.5-4.4M12 12l6.8 1.6M12 12l3 6.3M12 12l-3 6.3M12 12l-6.8 1.6M12 12 6.5 7.6"/></g><circle cx="12" cy="12" r="2.7" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#326CE5"/>'),

"aks": (24, '<polygon points="12,2 19.82,5.77 21.75,14.22 16.34,21.01 7.66,21.01 2.25,14.22 4.18,5.77" fill="#0078D4"/><g stroke="#fff" stroke-width="1.35" stroke-linecap="round"><path d="M12 12V5.2M12 12l5.5-4.4M12 12l6.8 1.6M12 12l3 6.3M12 12l-3 6.3M12 12l-6.8 1.6M12 12 6.5 7.6"/></g><circle cx="12" cy="12" r="2.7" fill="#fff"/><circle cx="12" cy="12" r="1.3" fill="#0078D4"/>'),

"pod": (24, '<polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5" fill="none" stroke="#326CE5" stroke-width="1.8" stroke-linejoin="round"/><polygon points="12,7.6 16,9.9 16,14.4 12,16.7 8,14.4 8,9.9" fill="#326CE5"/>'),

"nginx": (24, '<path d="M12 1.8 21 6.9v10.2L12 22.2 3 17.1V6.9z" fill="#009639"/><text x="12" y="16.1" font-family="sans-serif" font-size="10.5" font-weight="700" fill="#fff" text-anchor="middle">N</text>'),

"azure": (24, '<path d="M9.6 2h4.9L9.4 17.1 1.5 18.3z" fill="#50E6FF"/><path d="M12.4 5.9 16 2h.4L22.5 22H15l-6.9-.9 6.6-2.6z" fill="#0078D4"/><path d="M9.6 2 1.5 18.3l6.6-.6z" fill="#0f6cbd"/>'),

"acr": (24, '<rect x="2" y="3.5" width="20" height="17" rx="2.4" fill="#0078D4"/><g fill="#50E6FF"><rect x="4.8" y="6.6" width="6.2" height="4.6" rx="1"/><rect x="13" y="6.6" width="6.2" height="4.6" rx="1"/><rect x="4.8" y="12.9" width="6.2" height="4.6" rx="1"/><rect x="13" y="12.9" width="6.2" height="4.6" rx="1"/></g>'),

"lb": (24, '<rect x="1.5" y="9" width="7.5" height="6" rx="1.3" fill="#0078D4"/><g stroke="#0078D4" stroke-width="1.5" fill="none"><path d="M9 12h4V5.2h3.4M9 12h7.4M9 12h4v6.8h3.4"/></g><g fill="#50E6FF" stroke="#0078D4" stroke-width="1.1"><rect x="16.6" y="2.6" width="5.6" height="5.2" rx="1"/><rect x="16.6" y="9.4" width="5.6" height="5.2" rx="1"/><rect x="16.6" y="16.2" width="5.6" height="5.2" rx="1"/></g>'),

"config": (24, '<path d="M5 2.5h9.5L19.5 7.5v14H5z" fill="#0078D4"/><path d="M14.5 2.5 19.5 7.5h-5z" fill="#50E6FF"/><g stroke="#fff" stroke-width="1.4" stroke-linecap="round"><path d="M8 11.5h8M8 14.5h8M8 17.5h5"/></g>'),

"hpa": (24, '<g fill="#0078D4"><rect x="3" y="14" width="3.6" height="7" rx=".8"/><rect x="8.4" y="10.5" width="3.6" height="10.5" rx=".8"/><rect x="13.8" y="7" width="3.6" height="14" rx=".8"/></g><path d="M13.5 8 21 3M21 3h-4.6M21 3v4.6" stroke="#0078D4" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'),

"gauge": (24, '<path d="M2.5 18a9.5 9.5 0 1 1 19 0" fill="none" stroke="#0078D4" stroke-width="2.2" stroke-linecap="round"/><path d="M12 18 17 9.5" stroke="#0078D4" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="18" r="2" fill="#0078D4"/>'),

"probe": (24, '<path d="M1.5 12.5h4.2l2.3-5.6 3.4 11 2.6-7.2 1.7 1.8h6.8" fill="none" stroke="#C0504D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),

"shield": (24, '<path d="M12 1.8 20.6 5.4v6.2c0 4.8-3.5 8.8-8.6 10.4C6.9 20.4 3.4 16.4 3.4 11.6V5.4z" fill="none" stroke="#0078D4" stroke-width="2"/><path d="m8 12 2.8 2.8L16.4 9.2" fill="none" stroke="#0078D4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'),

"check": (24, '<circle cx="12" cy="12" r="10.5" fill="#2E9E4F"/><path d="m6.8 12.4 3.6 3.6 6.8-8" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>'),

"stop": (24, f'<polygon points="{octagon(12,12,11)}" fill="#D93025"/><rect x="6" y="10.6" width="12" height="2.8" rx="1" fill="#fff"/>'),

"lock": (24, '<rect x="4.5" y="10.5" width="15" height="11" rx="2.2" fill="#2E9E4F"/><path d="M8 10.5V7.6a4 4 0 0 1 8 0v2.9" fill="none" stroke="#2E9E4F" stroke-width="2.2"/><circle cx="12" cy="15.4" r="1.7" fill="#fff"/>'),

"git": (24, '<circle cx="6.5" cy="5" r="2.8" fill="#F05033"/><circle cx="6.5" cy="19" r="2.8" fill="#F05033"/><circle cx="17.5" cy="9" r="2.8" fill="#F05033"/><path d="M6.5 7.8v8.4M6.5 14c0-3 2-5 8-5" fill="none" stroke="#F05033" stroke-width="2"/>'),

"java": (24, '<path d="M6 17.5c4.5 1.6 11 1.4 15-.4" fill="none" stroke="#E76F00" stroke-width="2" stroke-linecap="round"/><path d="M8 13.6c3 1 7.5.9 10.4-.4" fill="none" stroke="#E76F00" stroke-width="1.8" stroke-linecap="round"/><path d="M13.5 1.5c2.6 2.8-2.9 4-2.9 6.4 0 1.3 1.7 2.3 1.7 2.3s-4.6-1.2-4.6-3.6c0-2.1 4-3.1 5.8-5.1z" fill="#E76F00"/><path d="M6 20.4c4.6 1.9 11.5 1.4 14-.6" fill="none" stroke="#E76F00" stroke-width="1.6" stroke-linecap="round"/>'),
}

def icon(name, x, y, size):
    vb, body = ICONS[name]
    s = size / vb
    return f'<g transform="translate({x:g},{y:g}) scale({s:.5g})">{body}</g>'
