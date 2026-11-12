const root = document.documentElement;
const canvas = document.querySelector('.canvas');
const eyeContainer = document.querySelector('.eyes');

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = v => Math.max(0, Math.min(1, v));

let locked = false, spawnTimer;

const doors = [...document.querySelectorAll('.door')];
const eyes = [...document.querySelectorAll('.eye')];
const doorPool = [...doors].sort(() => Math.random() - 0.5);
const correctDoor = doorPool[Math.floor(Math.random() * doorPool.length)];
let eyePool = [...eyes];

const rand = (min, max) => min + Math.random() * (max - min);

function randomize(element, extra) {
  Object.entries({
    'drift-x': rand(-5, 5),
    'drift-y': rand(-5, 5),
    'drift-duration': `${rand(21, 41)}s`,
    ...extra
  }).forEach(([name, value]) => element.style.setProperty(`--${name}`, value));
}

doors.forEach(door => randomize(door, {
  size: 4 + Math.random() ** 2 * 16,
  tilt: rand(-11, 9)
}));

eyes.forEach(eye => randomize(eye, { size: rand(6, 13) }));

const randomPosition = () => ({
  x: 10 + Math.random() * 80,
  y: 15 + Math.random() * 70
});

function place(element, x, y) {
  element.style.setProperty('--pos-x', x);
  element.style.setProperty('--pos-y', y);
  element.style.setProperty('--drift-delay', `${-Math.random() * 8}s`);
  element.classList.remove('born', 'leaving');
  void element.offsetWidth;
  element.classList.add('born');
}

function spawnDoor() {
  if (locked || !doorPool.length) return;

  const { x, y } = randomPosition();
  place(doorPool.shift(), x, y);

  if (doorPool.length) spawnTimer = setTimeout(spawnDoor, 160 + Math.random() * 80);
}

function getEye() {
  if (eyePool.length) return eyePool.shift();

  const eye = eyes[0].cloneNode(true);

  randomize(eye, { size: rand(6, 13) });
  eye.classList.remove('born', 'leaving');
  eyeContainer.appendChild(eye);
  return eye;
}

canvas.addEventListener('click', event => {
  const door = event.target.closest('.door');

  if (!door || locked || !door.classList.contains('born') || door.dataset.used === 'true') return;

  if (door === correctDoor) {
    locked = true;
    clearTimeout(spawnTimer);
    setNoticed(false);
    door.classList.add('chosen');
    root.classList.add('ending');
    setTimeout(() => door.classList.add('door-fade'), 1200);
  } else {
    door.dataset.used = 'true';
    door.classList.add('leaving');

    const eye = getEye();
    const { x, y } = randomPosition();
    setTimeout(() => place(eye, x, y), 250);
  }
});

const target = { x: 0, y: .5 };
const smooth = { x: 0, y: .5 };

let last = performance.now(), lastMove = last;
let idle = 0, still = 0, noticed = false;

function setNoticed(next) {
  if (next === noticed) return;
  noticed = next;
  root.classList.toggle('noticed', noticed);
}

function poke() {
  if (locked) return;
  lastMove = performance.now();
  setNoticed(false);
}

function track(e) {
  poke();
  target.x = e.clientX / innerWidth;
  target.y = e.clientY / innerHeight;
}

addEventListener('pointermove', track);
addEventListener('pointerdown', track);
['wheel', 'touchmove', 'keydown'].forEach(evt =>
  addEventListener(evt, poke, { passive: true })
);

function tick(now) {
  const dt = Math.min((now - last) / 1000, .1);
  last = now;

  const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 3.5);
  smooth.x += (target.x - smooth.x) * ease;
  smooth.y += (target.y - smooth.y) * ease;

  setNoticed(!locked && now - lastMove > 4000);

  still += ((noticed ? 1 : 0) - still) * (1 - Math.exp(-dt * 2.5));
  idle += ((now - lastMove > 700 ? 1 : 0) - idle) * (1 - Math.exp(-dt * .8));

  const amp = reduceMotion ? 0 : (.015 + idle * .075) * (1 - still);
  const t = now / 1000;
  const wanderX = (Math.sin(t * .31) + Math.sin(t * .17 + 1.3) * .7) * .6 * amp;
  const wanderY = (Math.sin(t * .23 + 2.1) + Math.sin(t * .13 + .4) * .7) * .6 * amp;

  if (!locked) {
    root.style.setProperty('--mouse-x', clamp(smooth.x + wanderX).toFixed(4));
    root.style.setProperty('--mouse-y', clamp(smooth.y + wanderY).toFixed(4));
  }

  requestAnimationFrame(tick);
}

spawnTimer = setTimeout(spawnDoor, 150);
requestAnimationFrame(tick);