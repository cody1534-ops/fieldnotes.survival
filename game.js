/* ============================================================
   FIELD NOTES — core game logic (no DOM dependencies here)
   ============================================================ */

const WEATHERS = {
  Clear:    { icon: '☀️', day: 80, night: 35, desc: 'Clear skies.' },
  Overcast: { icon: '⛅', day: 60, night: 30, desc: 'Grey and still.' },
  Rain:     { icon: '🌧️', day: 50, night: 25, desc: 'Steady rain.' },
  Storm:    { icon: '⛈️', day: 40, night: 15, desc: 'A violent storm.' },
  Heatwave: { icon: '🔆', day: 95, night: 55, desc: 'Oppressive heat.' },
  ColdSnap: { icon: '❄️', day: 35, night: 5,  desc: 'Bitter, biting cold.' },
};
const WEATHER_WEIGHTS = { Clear: 30, Overcast: 20, Rain: 20, Storm: 10, Heatwave: 10, ColdSnap: 10 };

const LOCATIONS = {
  forest:    { name: 'Pine Forest', icon: '🌲', desc: 'Dense woods. Good wood and herbs.', loot: { wood: 0.35, herbs: 0.25, food: 0.20, cloth: 0.10, stone: 0.10 } },
  riverbank: { name: 'Riverbank',   icon: '🏞️', desc: 'Fresh water and reeds.',            loot: { water: 0.40, cloth: 0.20, food: 0.25, stone: 0.15 } },
  ruins:     { name: 'Old Ruins',   icon: '🏚️', desc: 'Scrap metal, but riskier.',         loot: { metal: 0.35, cloth: 0.25, stone: 0.20, wood: 0.20 } },
  field:     { name: 'Open Field',  icon: '🌾', desc: 'Wild crops and loose stone.',        loot: { food: 0.35, herbs: 0.25, stone: 0.25, wood: 0.15 } },
};

const EVENT_TEMPLATES = [
  'Something rustles in the brush ahead.',
  'You find a half-collapsed structure that might hold supplies.',
  'The path splits into two directions.',
  'You spot movement at the edge of your vision.',
  'A pile of debris looks recently disturbed.',
];

const FISH_LOOT = { food: 0.85, metal: 0.15 };
const FISH_EVENT_TEMPLATES = [
  'The line goes taut almost immediately.',
  'Something circles beneath the surface, cautious.',
  'The water here looks slow and promising.',
  'A shadow passes under the ripples.',
];
const TRAP_COST = { wood: 1, cloth: 1 };
const TRAP_MAX = 3;
const TRAP_READY_HOURS = 8;

const FRAGMENTS = [
  'Day 4 — the radio still hums but no one answers. Marked the ridge with red cloth, just in case.',
  "Found a rusted flare gun near the old campsite. No flares left. Kept the casing anyway.",
  'The river bends north past the fallen bridge. The water there runs clean, if you boil it first.',
  "Something's living in the collapsed tower. I hear it at night. Don't go in after dark.",
  'Built a signal mirror from a broken windshield. Aimed it at the pass every clear morning.',
  "If you're reading this: north of the river, half-buried in the dirt, there's a metal antenna. I think it still transmits. I ran out of time to check.",
];

const RECIPES = [
  { id: 'campfireKit', name: 'Campfire Kit',     desc: 'Lets you build and light fires.',              cost: { wood: 5, stone: 2 }, effect: 'campfireKit' },
  { id: 'waterFilter', name: 'Water Filter',     desc: 'Makes drinking water safe.',                   cost: { wood: 3, cloth: 2 }, effect: 'waterFilter' },
  { id: 'storageCrate',name: 'Storage Crate',    desc: 'Adds 20 storage capacity. Stacks.',            cost: { wood: 6, metal: 3 }, effect: 'storageCrate' },
  { id: 'bedding',     name: 'Insulated Bedding',desc: 'Warmer, more comfortable nights.',             cost: { cloth: 4, herbs: 2 }, effect: 'bedding' },
  { id: 'rainCatcher', name: 'Rain Catcher',     desc: 'Collects water automatically on rainy days.',  cost: { wood: 3, cloth: 2 }, effect: 'rainCatcher' },
  { id: 'torch',       name: 'Torch',            desc: 'Safer scavenging after dark.',                 cost: { wood: 1, cloth: 1 }, effect: 'torch' },
  { id: 'bandage',     name: 'Bandage',          desc: 'Treats injuries. Restores 30 health when used.', cost: { cloth: 2, herbs: 1 }, effect: 'bandage' },
  { id: 'fishingRod',  name: 'Fishing Rod',      desc: 'Needed to fish at the riverbank.',             cost: { wood: 2, cloth: 1, metal: 1 }, effect: 'fishingRod' },
  { id: 'signalBeacon',name: 'Repair the Beacon',desc: 'Needs all six field notes. Ends the game.',    cost: { metal: 4, cloth: 2, wood: 3 }, effect: 'signalBeacon' },
];

const PACKS = {
  food:      { name: 'Food Bulk Pack',        price: '$4.99', grant: { food: 40 } },
  water:     { name: 'Water Bulk Pack',       price: '$4.99', grant: { water: 40 } },
  materials: { name: 'Crafting Materials Pack', price: '$7.99', grant: { wood: 10, cloth: 6, metal: 6, stone: 6 } },
};

const ROMAN = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];

const TIER_DEFS = [
  { key: 'daysSurvived',   label: 'Days Survived',
    names: ['First Light','Third Sunrise','Five Days Steady','Ten Days Standing','Fifteen and Holding','Twenty Days Out','A Month Alone','Fifty Days','Seventy-Five Days','One Hundred Days'],
    thresholds: [1,3,5,10,15,20,30,50,75,100],
    desc: t => `Survive ${t} full day${t>1?'s':''}.` },
  { key: 'woodCollected',  label: 'Wood Gatherer',   thresholds: [10,25,50,100,250,500,1000], desc: t => `Collect ${t} wood in total.` },
  { key: 'foodCollected',  label: 'Forager',         thresholds: [10,25,50,100,250,500,1000], desc: t => `Gather ${t} food in total.` },
  { key: 'waterCollected', label: 'Water Bearer',    thresholds: [10,25,50,100,250,500,1000], desc: t => `Collect ${t} water in total.` },
  { key: 'itemsCrafted',   label: 'Craftsman',       thresholds: [1,5,10,20,35,50], desc: t => `Craft ${t} item${t>1?'s':''} in total.` },
  { key: 'scavengeTrips',  label: 'Wanderer',        thresholds: [1,10,25,50,100,200], desc: t => `Complete ${t} scavenging trips.` },
  { key: 'firesLit',       label: 'Firekeeper',      thresholds: [1,5,10,25,50], desc: t => `Light a fire ${t} time${t>1?'s':''}.` },
  { key: 'nightsSurvived', label: 'Nightfall Survivor', thresholds: [1,5,10,25,50], desc: t => `Survive ${t} night${t>1?'s':''}.` },
  { key: 'stormsSurvived', label: 'Storm-Tested',    thresholds: [1,3,5,10], desc: t => `Endure ${t} storm${t>1?'s':''}.` },
  { key: 'fragmentsFound', label: 'Torn Pages',      thresholds: [1,2,3,4,5,6], desc: t => `Recover ${t} field-note fragment${t>1?'s':''}.` },
  { key: 'fishCaught',     label: 'Angler',          thresholds: [1,10,25,50,100,250], desc: t => `Catch ${t} fish in total.` },
  { key: 'animalsTrapped', label: 'Trapper',         thresholds: [1,10,25,50,100,250], desc: t => `Catch ${t} animal${t>1?'s':''} in traps.` },
];

function buildTierAchievements() {
  const list = [];
  for (const tier of TIER_DEFS) {
    tier.thresholds.forEach((t, i) => {
      list.push({
        id: `${tier.key}_${i}`,
        name: tier.names ? tier.names[i] : `${tier.label} ${ROMAN[i]}`,
        desc: tier.desc(t),
        check: state => (state.counters[tier.key] || 0) >= t,
      });
    });
  }
  return list;
}

const UNIQUE_ACHIEVEMENTS = [
  { id: 'firstBlood',      name: 'First Blood',        desc: 'Survive your first injury.',                          check: s => s.counters.injuries >= 1 },
  { id: 'closeCall',       name: 'Close Call',         desc: 'Survive with your health at 10 or below.',            check: s => s.flags.hadCloseCall },
  { id: 'wellFed',         name: 'Well Fed',           desc: 'Reach full hunger satisfaction.',                     check: s => s.hunger >= 100 },
  { id: 'hydrationStation',name: 'Hydration Station',  desc: 'Reach full thirst satisfaction.',                     check: s => s.thirst >= 100 },
  { id: 'warmHearth',      name: 'Warm Hearth',        desc: 'Reach full comfort.',                                 check: s => s.comfort >= 100 },
  { id: 'packRat',         name: 'Pack Rat',           desc: 'Fill your storage to capacity.',                      check: s => totalItems(s.inventory) >= s.storageCap },
  { id: 'bigSpender',      name: 'Big Spender',        desc: 'Make your first bulk purchase.',                      check: s => s.counters.purchasesCount >= 1 },
  { id: 'shopaholic',      name: 'Shopaholic',         desc: 'Purchase every bulk pack at least once.',             check: s => s.purchasesMade.food && s.purchasesMade.water && s.purchasesMade.materials },
  { id: 'architect',       name: 'Architect',          desc: 'Build a Storage Crate.',                              check: s => s.builtItems.storageCrate },
  { id: 'tinkerer',        name: 'Tinkerer',           desc: 'Craft every known piece of equipment at least once.', check: s => s.builtItems.campfireKit && s.builtItems.waterFilter && s.builtItems.bedding && s.builtItems.rainCatcher && s.builtItems.torch && s.counters.bandagesCrafted >= 1 },
  { id: 'nightOwl',        name: 'Night Owl',          desc: 'Complete 10 scavenging trips at night.',              check: s => s.counters.nightScavenges >= 10 },
  { id: 'torchBearer',     name: 'Torch Bearer',       desc: 'Craft a torch.',                                      check: s => s.builtItems.torch },
  { id: 'purifier',        name: 'Purifier',           desc: 'Craft a water filter.',                               check: s => s.builtItems.waterFilter },
  { id: 'rainmaker',       name: 'Rainmaker',          desc: 'Craft a rain catcher.',                               check: s => s.builtItems.rainCatcher },
  { id: 'bandagedUp',      name: 'Bandaged Up',        desc: 'Use a bandage.',                                      check: s => s.counters.bandagesUsed >= 1 },
  { id: 'wellInsulated',   name: 'Well Insulated',     desc: 'Craft insulated bedding.',                            check: s => s.builtItems.bedding },
  { id: 'beaconReady',     name: 'Beacon Ready',       desc: 'Hold enough metal, cloth and wood to repair the beacon, all at once.', check: s => s.inventory.metal >= 4 && s.inventory.cloth >= 2 && s.inventory.wood >= 3 },
  { id: 'distressSignal',  name: 'Distress Signal',    desc: 'Repair the beacon and get rescued.',                  check: s => s.gameWon },
  { id: 'jackOfAllTrades', name: 'Jack of All Trades', desc: 'Scavenge at all four locations at least once.',       check: s => Object.values(s.counters.locationsVisited).every(v => v >= 1) },
  { id: 'wellStocked',     name: 'Well Stocked',       desc: 'Hold at least 20 wood, 20 food and 20 water at the same time.', check: s => s.inventory.wood >= 20 && s.inventory.food >= 20 && s.inventory.water >= 20 },
  { id: 'minimalist',      name: 'Minimalist',         desc: 'Reach day 10 without crafting anything.',             check: s => s.counters.itemsCrafted === 0 && s.counters.daysSurvived >= 10 },
  { id: 'fullyFueled',     name: 'Fully Fueled',       desc: 'Stack a fire\'s fuel to its maximum.',                check: s => s.fireFuel >= 12 },
];

const ACHIEVEMENTS = buildTierAchievements().concat(UNIQUE_ACHIEVEMENTS);

/* ---------- helpers ---------- */
function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
function totalItems(inv) { return Object.values(inv).reduce((a, b) => a + b, 0); }
function isNight(hour) { return hour >= 20 || hour < 6; }
function absHours(state) { return (state.day - 1) * 24 + state.hour; }
function ambientTemp(state) {
  const w = WEATHERS[state.weather];
  return isNight(state.hour) ? w.night : w.day;
}
function pickWeighted(table) {
  const entries = Object.entries(table);
  let r = Math.random();
  let cum = 0;
  for (const [k, w] of entries) { cum += w; if (r <= cum) return k; }
  return entries[entries.length - 1][0];
}
function rollWeather() {
  const total = Object.values(WEATHER_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const k in WEATHER_WEIGHTS) { r -= WEATHER_WEIGHTS[k]; if (r <= 0) return k; }
  return 'Clear';
}

/* ---------- default state ---------- */
function defaultState() {
  return {
    day: 1, hour: 6,
    hunger: 80, thirst: 80, warmth: 70, comfort: 60, health: 100,
    inventory: { wood: 6, food: 5, water: 5, cloth: 2, metal: 0, stone: 1, herbs: 1, bandage: 0 },
    storageCap: 40,
    builtItems: { campfireKit: false, waterFilter: false, storageCrate: false, bedding: false, rainCatcher: false, torch: false, fishingRod: false },
    fireLit: false, fireFuel: 0,
    weather: 'Clear',
    fragments: [false, false, false, false, false, false],
    traps: [],
    counters: {
      daysSurvived: 0, woodCollected: 0, foodCollected: 0, waterCollected: 0,
      itemsCrafted: 0, scavengeTrips: 0, firesLit: 0, nightsSurvived: 0, stormsSurvived: 0,
      fragmentsFound: 0, injuries: 0, sicknesses: 0, purchasesCount: 0,
      bandagesCrafted: 0, bandagesUsed: 0, nightScavenges: 0, fishCaught: 0, animalsTrapped: 0,
      locationsVisited: { forest: 0, riverbank: 0, ruins: 0, field: 0 },
    },
    purchasesMade: { food: false, water: false, materials: false },
    flags: { hadCloseCall: false },
    gameOver: false, gameWon: false,
    activeTab: 'camp',
    pendingEvent: null,
    log: [],
  };
}

/* ---------- Game class: wraps state + mutators, DOM-free ---------- */
class Game {
  constructor(persist) {
    this.persist = persist || { achievementsUnlocked: {}, bestDay: 0 };
    this.state = defaultState();
    this.newlyUnlocked = [];
  }

  addLog(text) {
    this.state.log.unshift({ day: this.state.day, hour: this.state.hour, text });
    if (this.state.log.length > 40) this.state.log.length = 40;
  }

  addToInventory(res, qty) {
    const s = this.state;
    const room = s.storageCap - totalItems(s.inventory);
    if (room <= 0) { this.addLog('Storage is full — nothing more will fit.'); return 0; }
    const actual = Math.min(qty, room);
    s.inventory[res] = (s.inventory[res] || 0) + actual;
    if (actual < qty) this.addLog('Storage nearly full — some of the find had to be left behind.');
    return actual;
  }

  spend(cost) {
    const s = this.state;
    for (const k in cost) if ((s.inventory[k] || 0) < cost[k]) return false;
    for (const k in cost) s.inventory[k] -= cost[k];
    return true;
  }

  checkAchievements() {
    this.newlyUnlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (this.persist.achievementsUnlocked[a.id]) continue;
      let ok = false;
      try { ok = !!a.check(this.state); } catch (e) { ok = false; }
      if (ok) {
        this.persist.achievementsUnlocked[a.id] = true;
        this.newlyUnlocked.push(a);
        this.addLog(`🏆 Achievement unlocked: ${a.name}`);
      }
    }
  }

  killIfDead(reason) {
    const s = this.state;
    if (s.health <= 10 && s.health > 0) s.flags.hadCloseCall = true;
    if (s.health <= 0 && !s.gameOver) {
      s.gameOver = true;
      this.addLog(reason || 'Your body finally gave out.');
      this.persist.bestDay = Math.max(this.persist.bestDay, s.day - 1);
    }
  }

  advanceTime(hours) {
    const s = this.state;
    for (let i = 0; i < hours; i++) {
      if (s.gameOver || s.gameWon) return;
      s.hour++;
      if (s.hour >= 24) { s.hour = 0; s.day++; }

      s.hunger = clamp(s.hunger - 3, 0, 100);
      const thirstDrain = s.weather === 'Heatwave' ? 6 : 4;
      s.thirst = clamp(s.thirst - thirstDrain, 0, 100);

      let warmthTarget = ambientTemp(s) + (s.fireLit ? 35 : 0) + (isNight(s.hour) && s.builtItems.bedding ? 15 : 0);
      warmthTarget = Math.min(warmthTarget, 100);
      s.warmth = clamp(s.warmth + (warmthTarget - s.warmth) * 0.3, 0, 100);

      let comfortTarget = 50 + (s.fireLit ? 30 : 0) + (s.builtItems.bedding && isNight(s.hour) ? 15 : 0)
        - ((s.weather === 'Storm' || s.weather === 'ColdSnap') ? 25 : 0) - (s.weather === 'Rain' ? 10 : 0);
      comfortTarget = clamp(comfortTarget, 0, 100);
      s.comfort = clamp(s.comfort + (comfortTarget - s.comfort) * 0.25, 0, 100);

      if (s.fireLit) {
        s.fireFuel -= 1;
        if (s.fireFuel <= 0) { s.fireLit = false; this.addLog('The fire has burned out.'); }
      }

      let dmg = 0;
      if (s.hunger <= 0) dmg += 2;
      if (s.thirst <= 0) dmg += 3;
      if (s.warmth <= 0) dmg += 3;
      if (s.comfort <= 0) dmg += 1;
      if (dmg > 0) s.health = clamp(s.health - dmg, 0, 100);
      else if (s.hunger > 60 && s.thirst > 60 && s.warmth > 50) s.health = clamp(s.health + 1, 0, 100);

      this.killIfDead('Exposure and neglect finally caught up with you.');

      if (s.hour === 6) {
        if (s.day > 1) {
          s.counters.nightsSurvived++;
          if (s.weather === 'Storm') s.counters.stormsSurvived++;
        }
        if (s.builtItems.rainCatcher && s.weather === 'Rain') {
          const got = this.addToInventory('water', 3);
          if (got > 0) this.addLog(`The rain catcher filled with ${got} water.`);
        }
        s.weather = rollWeather();
      }
      s.counters.daysSurvived = s.day - 1;
      if (s.gameOver) return;
    }
  }

  gatherWood() {
    if (this.state.gameOver || this.state.gameWon || this.state.pendingEvent) return;
    this.advanceTime(2);
    if (this.state.gameOver) { this.checkAchievements(); return; }
    const qty = 2 + Math.floor(Math.random() * 3);
    const got = this.addToInventory('wood', qty);
    this.state.counters.woodCollected += got;
    if (Math.random() < 0.1) this.addToInventory('stone', 1);
    this.addLog(`Gathered ${got} wood.`);
    this.checkAchievements();
  }

  fetchWater() {
    if (this.state.gameOver || this.state.gameWon || this.state.pendingEvent) return;
    this.advanceTime(2);
    if (this.state.gameOver) { this.checkAchievements(); return; }
    const qty = 2 + Math.floor(Math.random() * 2);
    const got = this.addToInventory('water', qty);
    this.state.counters.waterCollected += got;
    this.addLog(`Collected ${got} water (unclean).`);
    this.checkAchievements();
  }

  restHour() {
    if (this.state.gameOver || this.state.gameWon || this.state.pendingEvent) return;
    this.advanceTime(1);
    if (!this.state.gameOver) this.addLog('You rest for an hour.');
    this.checkAchievements();
  }

  sleepTillDawn() {
    if (this.state.gameOver || this.state.gameWon || this.state.pendingEvent) return;
    const s = this.state;
    const h = s.hour < 6 ? (6 - s.hour) : (24 - s.hour + 6);
    this.advanceTime(h);
    if (!s.gameOver) {
      s.comfort = clamp(s.comfort + (s.builtItems.bedding ? 15 : 5), 0, 100);
      this.addLog('You sleep until dawn.');
    }
    this.checkAchievements();
  }

  eat() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent || s.inventory.food < 1) return;
    s.inventory.food--;
    s.hunger = clamp(s.hunger + 30, 0, 100);
    this.addLog('You eat.');
    this.checkAchievements();
  }

  drink() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent || s.inventory.water < 1) return;
    s.inventory.water--;
    s.thirst = clamp(s.thirst + 35, 0, 100);
    if (!s.builtItems.waterFilter && Math.random() < 0.15) {
      s.health = clamp(s.health - 15, 0, 100);
      s.comfort = clamp(s.comfort - 10, 0, 100);
      s.counters.sicknesses++;
      this.addLog('The water was contaminated. You feel sick.');
      this.killIfDead('The sickness was too much.');
    } else {
      this.addLog('You drink.');
    }
    this.checkAchievements();
  }

  useBandage() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent || (s.inventory.bandage || 0) < 1) return;
    s.inventory.bandage--;
    s.health = clamp(s.health + 30, 0, 100);
    s.counters.bandagesUsed++;
    this.addLog('You bandage your wounds.');
    this.checkAchievements();
  }

  lightFire() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent) return;
    if (!s.builtItems.campfireKit) { this.addLog('You need a campfire kit first.'); return; }
    if (s.fireLit) return;
    if (s.inventory.wood < 2) { this.addLog('Not enough wood to light a fire.'); return; }
    if (s.weather === 'Storm') { this.addLog("The wind and rain won't let a fire catch."); return; }
    s.inventory.wood -= 2;
    s.fireLit = true;
    s.fireFuel = s.weather === 'Rain' ? 3 : 6;
    s.counters.firesLit++;
    this.addLog('You light a fire.');
    this.checkAchievements();
  }

  addFuel() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent || !s.fireLit) return;
    if (s.inventory.wood < 2) { this.addLog('Not enough wood to add fuel.'); return; }
    s.inventory.wood -= 2;
    s.fireFuel = Math.min(12, s.fireFuel + 6);
    this.addLog('You feed the fire.');
  }

  startScavenge(locId) {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent) return;
    this.advanceTime(3);
    if (s.gameOver) { this.checkAchievements(); return; }
    s.counters.scavengeTrips++;
    s.counters.locationsVisited[locId]++;
    if (isNight(s.hour)) s.counters.nightScavenges++;
    const template = EVENT_TEMPLATES[Math.floor(Math.random() * EVENT_TEMPLATES.length)];
    s.pendingEvent = { kind: 'scavenge', locId, template, result: null };
    this.checkAchievements();
  }

  goFishing() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent) return;
    if (!s.builtItems.fishingRod) { this.addLog('You need a fishing rod first.'); return; }
    this.advanceTime(2);
    if (s.gameOver) { this.checkAchievements(); return; }
    const template = FISH_EVENT_TEMPLATES[Math.floor(Math.random() * FISH_EVENT_TEMPLATES.length)];
    s.pendingEvent = { kind: 'fish', locId: 'riverbank', template, result: null };
    this.checkAchievements();
  }

  setTrap() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent) return;
    if (s.traps.length >= TRAP_MAX) { this.addLog(`You have no room for more traps (max ${TRAP_MAX}).`); return; }
    if (!this.spend(TRAP_COST)) { this.addLog('Not enough materials to set a trap (needs 1 wood, 1 cloth).'); return; }
    this.advanceTime(1);
    if (s.gameOver) { this.checkAchievements(); return; }
    s.traps.push({ id: Math.random().toString(36).slice(2), readyAt: absHours(s) + TRAP_READY_HOURS });
    this.addLog('You set a trap nearby.');
    this.checkAchievements();
  }

  checkTraps() {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent) return;
    if (s.traps.length === 0) { this.addLog('No traps are set.'); return; }
    const now = absHours(s);
    const ready = s.traps.filter(t => now >= t.readyAt);
    const notReady = s.traps.filter(t => now < t.readyAt);
    if (ready.length === 0) {
      const hrs = Math.min(...notReady.map(t => t.readyAt - now));
      this.addLog(`Traps aren't ready yet — about ${hrs}h left.`);
      return;
    }
    this.advanceTime(1);
    if (s.gameOver) { this.checkAchievements(); return; }
    let caught = 0, empty = 0, lost = 0;
    let destroyedCut = 5, emptyCut = 50, smallCut = 80;
    if (s.weather === 'Storm') { destroyedCut = 15; emptyCut = 65; smallCut = 85; }
    for (let i = 0; i < ready.length; i++) {
      const roll = Math.random() * 100;
      if (roll < destroyedCut) { lost++; }
      else if (roll < emptyCut) { empty++; }
      else if (roll < smallCut) {
        const qty = 1 + Math.floor(Math.random() * 2);
        const got = this.addToInventory('food', qty);
        s.counters.foodCollected += got; s.counters.animalsTrapped += got; caught += got;
      } else {
        const qty = 3 + Math.floor(Math.random() * 3);
        const got = this.addToInventory('food', qty);
        s.counters.foodCollected += got; s.counters.animalsTrapped += got; caught += got;
        if (Math.random() < 0.3) this.addToInventory('cloth', 1);
      }
    }
    s.traps = notReady;
    this.addLog(`Checked ${ready.length} trap${ready.length>1?'s':''}: ${caught} food caught, ${empty} empty, ${lost} destroyed.`);
    this.checkAchievements();
  }

  resolveChoice(riskKey) {
    const s = this.state;
    if (!s.pendingEvent || s.gameOver || s.gameWon) return;
    const kind = s.pendingEvent.kind || 'scavenge';
    const loc = LOCATIONS[s.pendingEvent.locId];
    let injuryChance;
    if (kind === 'fish') injuryChance = riskKey === 'bold' ? 12 : riskKey === 'safe' ? 3 : 0;
    else injuryChance = riskKey === 'safe' ? 5 : riskKey === 'bold' ? 20 : 0;
    if (isNight(s.hour) && !s.builtItems.torch) injuryChance += 15;
    if (s.weather === 'Storm') injuryChance += 15;
    injuryChance = Math.min(injuryChance, 80);

    let resultText = '';
    const roll = Math.random() * 100;
    if (roll < injuryChance) {
      const dmg = 8 + Math.floor(Math.random() * 13);
      s.health = clamp(s.health - dmg, 0, 100);
      s.comfort = clamp(s.comfort - 10, 0, 100);
      s.counters.injuries++;
      resultText = `It went wrong — you're hurt. (-${dmg} health)`;
      this.killIfDead('Your injuries proved fatal.');
    } else {
      const lootRoll = Math.random() * 100;
      let tier;
      if (riskKey === 'safe') tier = lootRoll < 60 ? 'small' : lootRoll < 75 ? 'good' : 'nothing';
      else if (riskKey === 'bold') tier = lootRoll < 35 ? 'good' : lootRoll < 65 ? 'small' : 'nothing';
      else tier = lootRoll < 15 ? 'small' : 'nothing';

      if (tier === 'nothing') {
        resultText = 'Nothing worth taking.';
      } else {
        const n = tier === 'good' ? 2 : 1;
        const gains = [];
        const table = kind === 'fish' ? FISH_LOOT : loc.loot;
        for (let i = 0; i < n; i++) {
          const res = pickWeighted(table);
          const qty = tier === 'good' ? (2 + Math.floor(Math.random() * 3)) : (1 + Math.floor(Math.random() * 2));
          const got = this.addToInventory(res, qty);
          if (res === 'wood') s.counters.woodCollected += got;
          if (res === 'food') { s.counters.foodCollected += got; if (kind === 'fish') s.counters.fishCaught += got; }
          if (res === 'water') s.counters.waterCollected += got;
          if (got > 0) gains.push(`${got} ${res}`);
        }
        resultText = gains.length ? `You found: ${gains.join(', ')}.` : 'Nothing worth taking.';
      }

      const fragChance = kind === 'fish'
        ? (riskKey === 'safe' ? 1 : riskKey === 'bold' ? 3 : 0.5)
        : (riskKey === 'safe' ? 3 : riskKey === 'bold' ? 8 : 1);
      if (s.counters.fragmentsFound < FRAGMENTS.length && Math.random() * 100 < fragChance) {
        const unfound = s.fragments.map((f, i) => (f ? -1 : i)).filter(i => i >= 0);
        const idx = unfound[Math.floor(Math.random() * unfound.length)];
        s.fragments[idx] = true;
        s.counters.fragmentsFound++;
        resultText += ` Tucked in the debris, a torn field note: "${FRAGMENTS[idx]}"`;
      }
    }
    s.pendingEvent.result = resultText;
    this.checkAchievements();
  }

  closeEvent() {
    if (this.state.pendingEvent && this.state.pendingEvent.result !== null) {
      this.state.pendingEvent = null;
    }
  }

  craft(id) {
    const s = this.state;
    if (s.gameOver || s.gameWon || s.pendingEvent) return { ok: false, msg: '' };
    const r = RECIPES.find(x => x.id === id);
    if (!r) return { ok: false, msg: '' };
    if (r.id !== 'bandage' && r.id !== 'storageCrate' && r.id !== 'signalBeacon' && s.builtItems[r.effect]) {
      return { ok: false, msg: 'Already built.' };
    }
    if (r.id === 'signalBeacon' && s.counters.fragmentsFound < FRAGMENTS.length) {
      return { ok: false, msg: 'The beacon needs all six field notes to be repaired correctly.' };
    }
    if (!this.spend(r.cost)) return { ok: false, msg: 'Not enough materials.' };
    this.advanceTime(1);
    if (s.gameOver) { this.checkAchievements(); return { ok: true, msg: '' }; }
    if (r.effect === 'bandage') { s.inventory.bandage = (s.inventory.bandage || 0) + 1; s.counters.bandagesCrafted++; }
    else if (r.effect === 'storageCrate') { s.storageCap += 20; s.builtItems.storageCrate = true; }
    else if (r.effect === 'signalBeacon') {
      s.gameWon = true;
      this.addLog('The beacon flares to life. Somewhere, someone sees it.');
      this.persist.bestDay = Math.max(this.persist.bestDay, s.day - 1);
    } else { s.builtItems[r.effect] = true; }
    s.counters.itemsCrafted++;
    this.addLog(`Crafted: ${r.name}.`);
    this.checkAchievements();
    return { ok: true, msg: `Crafted ${r.name}.` };
  }

  buyPack(id) {
    const p = PACKS[id];
    if (!p) return;
    for (const k in p.grant) this.addToInventory(k, p.grant[k]);
    this.state.purchasesMade[id] = true;
    this.state.counters.purchasesCount++;
    this.addLog(`Purchased ${p.name} (prototype — no real charge).`);
    this.checkAchievements();
  }

  restart() {
    this.persist.bestDay = Math.max(this.persist.bestDay, this.state.day - 1);
    this.state = defaultState();
  }
}
