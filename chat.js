/* Чат-бот «ТЫ ПРАВ»: по шагам собирает заявку (тема → суть → имя → телефон) и передаёт её юристу.
   Отправка — window.tpSendLead (TODO: подключить почту / Битрикс). */
(() => {
const ICON = '/img/extra/chat_bot.webp';      // фирменная иконка от Codex; пока её нет — рисуем SVG
const AVATAR = '/img/favicon.svg'; // ровный плоский знак: 3D-медальон в маленьком круге выглядел перекошенным
const svgBot = '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6C13 6 5 13.2 5 22.3c0 5 2.5 9.5 6.5 12.5L10 42l8.3-4.3c1.8.5 3.7.8 5.7.8 11 0 19-7.2 19-16.2S35 6 24 6Z" fill="#fff"/><path d="M16.5 17.2c0-1.4 2-1.5 2.4-.4.3.9-.3 1.9-1.4 1.9h13.1c1.1 0 1.7-1 1.4-1.9-.4-1.1-2.4-1-2.4.4" fill="none" stroke="#c8102e" stroke-width="1.8" stroke-linecap="round"/><rect x="18.6" y="19.6" width="2.4" height="10.4" rx=".8" fill="#c8102e"/><rect x="22.8" y="19.6" width="2.4" height="10.4" rx=".8" fill="#c8102e"/><rect x="27" y="19.6" width="2.4" height="10.4" rx=".8" fill="#c8102e"/></svg>';
const img = (src, cls) => `<img class="${cls}" src="${src}" alt="" onerror="this.outerHTML=this.dataset.f" data-f='${svgBot.replace(/'/g, '&#39;')}'>`;

const TOPICS = ['Семья и алименты', 'Уголовное дело', 'Недвижимость и земля', 'Военные дела / СВО', 'ДТП и страховые', 'Бизнес и арбитраж', 'Долги, банки, кредиты', 'Другой вопрос'];

document.body.insertAdjacentHTML('beforeend', `
<div class="chat" id="chat">
  <div class="chat-teaser" id="chatTeaser" hidden><button type="button" class="chat-teaser-x" aria-label="Скрыть">×</button><b>Есть юридический вопрос?</b><span>Напишите — юрист перезвонит в течение 15 минут</span></div>
  <button class="chat-fab" id="chatFab" type="button" aria-label="Открыть чат с юристом" aria-expanded="false" aria-controls="chatBox">${img(ICON, 'chat-fab-ico')}<i class="chat-dot"></i></button>
  <section class="chat-box" id="chatBox" role="dialog" aria-label="Чат с юристом" hidden>
    <header class="chat-head">${img(AVATAR, 'chat-ava')}<div><b>Помощник «ТЫ ПРАВ»</b><small><i></i>Юристы на связи 10:00–22:00</small></div><button type="button" class="chat-x" aria-label="Закрыть чат">×</button></header>
    <div class="chat-log" id="chatLog" aria-live="polite"></div>
    <div class="chat-quick" id="chatQuick"></div>
    <form class="chat-in" id="chatIn" autocomplete="on"><input id="chatText" placeholder="Напишите сообщение…" aria-label="Сообщение" disabled><button type="submit" aria-label="Отправить" disabled><svg viewBox="0 0 24 24"><path d="M4 12h15m-6-6 6 6-6 6"/></svg></button></form>
  </section>
</div>`);

const $ = id => document.getElementById(id);
const box = $('chatBox'), fab = $('chatFab'), log = $('chatLog'), quick = $('chatQuick'), form = $('chatIn'), input = $('chatText'), teaser = $('chatTeaser');
const lead = { source: 'chat' };
let step = 'start', started = false;

const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const scroll = () => log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' });
const add = (who, html) => { log.insertAdjacentHTML('beforeend', `<div class="msg msg--${who}">${html}</div>`); scroll(); };
const say = (texts, then) => {
  const list = [].concat(texts); let i = 0;
  (function next() {
    if (i >= list.length) return then && then();
    log.insertAdjacentHTML('beforeend', '<div class="msg msg--bot msg--typing"><i></i><i></i><i></i></div>'); scroll();
    setTimeout(() => { log.querySelector('.msg--typing')?.remove(); add('bot', list[i++]); next(); }, 500 + Math.min(list[i].length * 9, 900));
  })();
};
const chips = (items, onPick) => {
  quick.innerHTML = items.map((t, i) => `<button type="button" data-i="${i}">${t}</button>`).join('');
  quick.querySelectorAll('button').forEach(b => b.addEventListener('click', () => { quick.innerHTML = ''; onPick(items[+b.dataset.i]); }));
};
const ask = (placeholder, type = 'text') => { input.disabled = form.lastChild.disabled = false; input.type = type; input.placeholder = placeholder; input.value = ''; input.focus(); };
const lock = () => { input.disabled = form.lastChild.disabled = true; input.placeholder = ''; input.value = ''; };

function phoneMask(v) {
  let d = v.replace(/\D/g, ''); if (!d) return '';
  if (d[0] === '8') d = '7' + d.slice(1); if (d[0] !== '7') d = '7' + d; d = d.slice(0, 11);
  const p = [d.slice(1, 4), d.slice(4, 7), d.slice(7, 9), d.slice(9, 11)];
  return '+7' + (p[0] ? ' (' + p[0] : '') + (p[0].length === 3 ? ') ' : '') + p[1] + (p[2] ? '-' + p[2] : '') + (p[3] ? '-' + p[3] : '');
}
input.addEventListener('input', () => { if (step === 'phone') input.value = phoneMask(input.value); });

function start() {
  started = true; step = 'topic';
  say(['Здравствуйте! Я помощник юридической компании «ТЫ ПРАВ».', 'Помогу передать ваш вопрос профильному юристу. Консультация по телефону — бесплатная.', 'С какой ситуацией нужна помощь?'],
    () => chips(TOPICS, t => { lead.topic = t; add('me', esc(t)); step = 'text'; say('Опишите коротко, что случилось — так юрист подготовится к звонку.', () => ask('Например: бывший муж не платит алименты…')); }));
}
form.addEventListener('submit', e => {
  e.preventDefault(); const v = input.value.trim(); if (!v || input.disabled) return;
  if (step === 'text') { lead.text = v; add('me', esc(v)); lock(); step = 'name'; say('Понял. Как к вам обращаться?', () => ask('Ваше имя')); }
  else if (step === 'name') { lead.name = v; add('me', esc(v)); lock(); step = 'phone'; say(`${esc(v)}, оставьте номер телефона — юрист перезвонит в течение 15 минут.`, () => ask('+7 (___) ___-__-__', 'tel')); }
  else if (step === 'phone') {
    if (v.replace(/\D/g, '').length < 11) { input.classList.add('err'); setTimeout(() => input.classList.remove('err'), 400); return; }
    lead.phone = v; add('me', esc(v)); lock(); step = 'confirm';
    say(`Проверьте заявку:<br><b>${esc(lead.topic)}</b><br>${esc(lead.text)}<br>${esc(lead.name)}, ${esc(lead.phone)}`, () => {
      chips(['Отправить юристу', 'Исправить'], c => {
        if (c === 'Исправить') { add('me', 'Исправить'); log.innerHTML = ''; Object.keys(lead).forEach(k => k !== 'source' && delete lead[k]); start(); return; }
        add('me', 'Отправить юристу'); step = 'done';
        (window.tpSendLead || (() => Promise.resolve()))({ ...lead }).then(() => say([
          `Спасибо, ${esc(lead.name)}! Заявка передана юристу.`,
          'Перезвоним в течение 15 минут (с 10:00 до 22:00 без выходных). Если срочно — звоните: <a href="tel:+78124094600">+7 (812) 409-46-00</a>.'
        ], () => chips(['Задать ещё вопрос'], () => { log.innerHTML = ''; start(); })));
      });
      quick.insertAdjacentHTML('beforeend', '<small class="chat-agree">Нажимая «Отправить», вы соглашаетесь с <a href="/politika-konfidentsialnosti#soglasie" target="_blank">правилами обработки</a> персональных данных</small>');
    });
  }
});

const open = v => {
  box.hidden = !v; fab.setAttribute('aria-expanded', v); document.getElementById('chat').classList.toggle('open', v); teaser.hidden = true;
  if (v) { try { sessionStorage.setItem('tpChatSeen', 1); } catch (e) {} if (!started) start(); else if (!input.disabled) input.focus(); }
};
fab.addEventListener('click', () => open(box.hidden));
box.querySelector('.chat-x').addEventListener('click', () => open(false));
addEventListener('keydown', e => { if (e.key === 'Escape' && !box.hidden) open(false); });
teaser.addEventListener('click', e => { if (e.target.closest('.chat-teaser-x')) { teaser.hidden = true; return; } open(true); });
let seen = false; try { seen = !!sessionStorage.getItem('tpChatSeen'); } catch (e) {}
if (!seen) setTimeout(() => { if (box.hidden) teaser.hidden = false; }, 7000);
})();
