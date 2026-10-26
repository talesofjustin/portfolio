import type { APIRoute } from 'astro';
import { Resend } from 'resend';

export const prerender = false;

const esc = (s: unknown) =>
  String(s ?? '').slice(0, 4000).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const POST: APIRoute = async ({ request }) => {
  let d: Record<string, string>;
  try { d = await request.json(); } catch { return new Response('Bad request', { status: 400 }); }
  // bots fill the hidden field; pretend it worked
  if (d.website) return new Response(null, { status: 204 });
  const name = (d.name || '').trim(), email = (d.email || '').trim();
  if (!name || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return new Response('Missing name or email', { status: 422 });

  const key = import.meta.env.RESEND_API_KEY;
  const to = import.meta.env.CONTACT_TO || 'hello@talesofjustin.com';
  const from = import.meta.env.CONTACT_FROM || 'Tales of Justin <website@talesofjustin.com>';
  if (!key) return new Response('Mail not configured', { status: 500 });

  const rows: [string, string][] = [
    ['Name', name], ['Company', d.company], ['Looking for', d.need], ['Budget', d.budget], ['Email', email],
  ];
  const html = `<h2 style="font-family:sans-serif">New enquiry via talesofjustin.com</h2>
<table style="font-family:sans-serif;font-size:14px">${rows
    .map(([k, v]) => `<tr><td style="color:#888;padding:4px 16px 4px 0">${k}</td><td>${esc(v) || '–'}</td></tr>`)
    .join('')}</table>
<p style="font-family:sans-serif;font-size:14px;white-space:pre-wrap">${esc(d.message) || ''}</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v || '–'}`).join('\n') + (d.message ? `\n\n${d.message}` : '');

  const { error } = await new Resend(key).emails.send({
    from, to, replyTo: email, subject: `Enquiry: ${name}${d.company ? ' (' + d.company + ')' : ''}`, html, text,
  });
  if (error) return new Response('Send failed', { status: 502 });
  return new Response(null, { status: 204 });
};
