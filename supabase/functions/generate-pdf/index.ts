import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response('ok', { headers: CORS })

  try {
    const { room, gear, presets, content, userId } = await req.json()

    const html = `<!DOCTYPE html><html lang="es">
<head><meta charset="UTF-8">
<style>
  body{font-family:-apple-system,sans-serif;color:#111;padding:40px;max-width:800px;margin:0 auto}
  h1{font-size:32px;font-weight:900;margin-bottom:6px;letter-spacing:-1px}
  h2{font-size:18px;font-weight:700;margin:28px 0 10px;color:#C00020;border-bottom:1px solid #e8e8e4;padding-bottom:6px}
  .meta{font-size:12px;color:#9b9b98;margin-bottom:36px}
  .card{border:1px solid #e8e8e4;border-radius:8px;padding:16px;margin:10px 0}
  .row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #f0f0ec;font-size:13px}
  .val{font-weight:600;color:#C00020}
  p{font-size:14px;line-height:1.8;color:#3a3a38;margin-bottom:14px}
  .step{display:flex;gap:12px;padding:8px 0;border-bottom:1px solid #f0f0ec;font-size:13px}
  .num{width:24px;height:24px;border-radius:50%;background:#C00020;color:#fff;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0}
</style>
</head>
<body>
<h1>Manual de Audio — ${room.nombre ?? 'Mi iglesia'}</h1>
<div class="meta">SoundMap by LevelPro · ${gear.top.nombre} + ${gear.sub.nombre} · ${room.largo}×${room.ancho}mt · ${room.capacidad} personas · ${new Date().toLocaleDateString('es-AR')}</div>

<h2>Diagnóstico acústico</h2>
<p>${content.diagnostico}</p>

<h2>Presets del sistema — DCX2496</h2>
${presets.map((p) => `
  <div class="card">
    <strong style="font-size:14px">${p.nombre}</strong>
    <div class="row"><span>Crossover</span><span class="val">${p.crossoverHz}Hz LR24</span></div>
    <div class="row"><span>TOPs</span><span class="val">${p.nivelTopsDb >= 0 ? '+' : ''}${p.nivelTopsDb} dB</span></div>
    <div class="row"><span>SUBs</span><span class="val">${p.nivelSubsDb} dB</span></div>
    <div class="row"><span>High Shelf</span><span class="val">${p.highShelfDb >= 0 ? '+' : ''}${p.highShelfDb} dB</span></div>
    <div class="row"><span>Vidrios</span><span>${p.vidrios ? 'Con vidrios' : 'Sin vidrios'}</span></div>
  </div>
`).join('')}

<h2>Posicionamiento del PA</h2>
<p>${content.posicionamiento}</p>

<h2>Recomendaciones</h2>
<p>${content.recomendaciones}</p>

<h2>Troubleshooting</h2>
${content.troubleshooting.map((t, i) => `
  <div class="step">
    <div class="num">${i + 1}</div>
    <span>${t}</span>
  </div>
`).join('')}

<h2>Notas de operación</h2>
<p>${content.notasOperacion}</p>

<p style="font-size:11px;color:#9b9b98;margin-top:40px;border-top:1px solid #e8e8e4;padding-top:16px">
  Generado por SoundMap by LevelPro · levelproaudio.com
</p>
</body></html>`

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const fileName = `${userId ?? 'anonymous'}/${Date.now()}.html`

    const { error: uploadError } = await supabase.storage
      .from('manuals')
      .upload(fileName, new Blob([html], { type: 'text/html' }), { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('manuals').getPublicUrl(fileName)

    return new Response(JSON.stringify({ url: publicUrl }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: CORS,
    })
  }
})