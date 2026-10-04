// Мини-тренировка дня: библиотека из 24 тренировок по 10–15 минут без инвентаря.
// Одна тренировка на день для обоих; при беременности — безопасная версия:
// без прыжков, скручиваний и упражнений лёжа на спине, в III триместре — без выпадов и планки.

export type Exercise = {
  name: string;
  /** Коротко о технике. */
  how: string;
  /** Замена при беременности (ключ другого упражнения). */
  pregnancyAlt?: string;
  /** Замена в III триместре. */
  t3Alt?: string;
};

export const EXERCISES: Record<string, Exercise> = {
  march: { name: "Марш на месте", how: "Поднимайте колени, руки работают. Дышите свободно." },
  arm_circles: { name: "Круги руками", how: "Руки в стороны, небольшие круги вперёд, затем назад." },
  hip_circles: { name: "Круги тазом", how: "Руки на поясе, плавно вращайте таз в обе стороны." },
  shoulder_rolls: { name: "Вращение плечами", how: "Плечи вверх, назад и вниз — медленно." },
  side_steps: { name: "Шаги в стороны", how: "Шаг вправо-влево, руки поднимаются вверх на каждом шаге." },
  squats: { name: "Приседания", how: "Стопы на ширине плеч, таз назад, колени над носками, спина прямая.", t3Alt: "chair_squats" },
  chair_squats: { name: "Приседания к стулу", how: "Опуститесь до касания стула и встаньте. Держитесь за опору при необходимости." },
  sumo_squats: { name: "Приседания плие", how: "Стопы шире плеч, носки врозь. Опускайтесь медленно, колени смотрят на носки." },
  lunges: { name: "Выпады назад", how: "Шаг назад, оба колена под 90°, вернуться. Чередуйте ноги.", pregnancyAlt: "split_squats", t3Alt: "chair_squats" },
  split_squats: { name: "Неглубокий выпад с опорой", how: "Держитесь за стул или стену, неглубоко опускайтесь в выпад.", t3Alt: "chair_squats" },
  calf_raises: { name: "Подъёмы на носки", how: "Медленно поднимитесь на носки и опуститесь. Можно держаться за опору." },
  glute_bridge: { name: "Ягодичный мостик", how: "Лёжа на спине, стопы на полу, поднимайте таз и сжимайте ягодицы.", pregnancyAlt: "kickbacks" },
  kickbacks: { name: "Отведение ноги назад стоя", how: "Держитесь за опору, отводите прямую ногу назад, не прогибая поясницу." },
  side_leg_raise: { name: "Отведение ноги в сторону", how: "Стоя у опоры, поднимайте ногу в сторону, корпус ровный." },
  clamshell: { name: "Ракушка", how: "Лёжа на боку, колени согнуты, раскрывайте верхнее колено, стопы вместе." },
  wall_sit: { name: "Стульчик у стены", how: "Спина к стене, колени не ниже 90°. Дышите ровно.", t3Alt: "chair_squats" },
  pushups: { name: "Отжимания", how: "Корпус прямой, локти под 45° к телу. Можно с колен.", pregnancyAlt: "wall_pushups" },
  knee_pushups: { name: "Отжимания с колен", how: "Колени на полу, тело — прямая линия от колен до головы.", pregnancyAlt: "wall_pushups" },
  wall_pushups: { name: "Отжимания от стены", how: "Ладони на стене на уровне груди, сгибайте локти, корпус прямой." },
  dips: { name: "Обратные отжимания от стула", how: "Руки на краю устойчивого стула, сгибайте локти до 90°.", t3Alt: "wall_pushups" },
  plank: { name: "Планка", how: "Локти под плечами, тело — прямая линия, живот подтянут.", pregnancyAlt: "incline_plank", t3Alt: "bird_dog" },
  incline_plank: { name: "Планка с опорой на стол", how: "Руки на столе или подоконнике, тело прямое, дышите свободно.", t3Alt: "bird_dog" },
  side_plank: { name: "Боковая планка с колен", how: "Опора на локоть и колено, таз приподнят, корпус ровный.", pregnancyAlt: "clamshell" },
  crunches: { name: "Скручивания", how: "Лёжа на спине, поднимайте лопатки, поясница прижата.", pregnancyAlt: "bird_dog" },
  bicycle: { name: "Велосипед", how: "Лёжа на спине, локоть к противоположному колену.", pregnancyAlt: "standing_knee_elbow" },
  standing_knee_elbow: { name: "Колено к локтю стоя", how: "Поднимайте колено к противоположному локтю, без резких скручиваний." },
  russian_twist: { name: "Повороты корпуса сидя", how: "Сидя, ноги на полу, корпус слегка назад, повороты в стороны.", pregnancyAlt: "side_bends" },
  side_bends: { name: "Наклоны в стороны стоя", how: "Рука вверх, плавный наклон в сторону, без рывков." },
  bird_dog: { name: "Птица-собака", how: "На четвереньках вытяните противоположные руку и ногу, задержитесь, смените сторону." },
  superman: { name: "Супермен", how: "Лёжа на животе, приподнимайте руки и ноги, взгляд в пол.", pregnancyAlt: "bird_dog" },
  jumping_jacks: { name: "Прыжки «звёздочка»", how: "Прыжком ноги врозь и руки вверх, затем обратно.", pregnancyAlt: "side_steps" },
  high_knees: { name: "Бег с высоким подниманием колен", how: "Быстро поднимайте колени, мягко приземляясь.", pregnancyAlt: "march" },
  mountain_climbers: { name: "Скалолаз", how: "Упор лёжа, поочерёдно подтягивайте колени к груди.", pregnancyAlt: "standing_knee_elbow" },
  burpees: { name: "Бёрпи без прыжка", how: "Присед, упор руками, шаг ногами назад и обратно, встать.", pregnancyAlt: "chair_squats" },
  skaters: { name: "Конькобежец", how: "Шаг-прыжок в сторону, вторая нога за опорную, руки помогают.", pregnancyAlt: "side_steps" },
  cat_cow: { name: "Кошка-корова", how: "На четвереньках прогибайте и округляйте спину на вдохе и выдохе." },
  pelvic_tilts: { name: "Наклоны таза у стены", how: "Спиной к стене, мягко прижимайте поясницу к стене и отпускайте." },
  child_pose: { name: "Поза ребёнка", how: "Колени широко, таз к пяткам, руки вперёд. Дышите глубоко." },
  chest_stretch: { name: "Растяжка груди", how: "Руки сцеплены за спиной, плечи назад, грудь раскрыта." },
  hamstring_stretch: { name: "Растяжка задней поверхности бедра", how: "Пятка вперёд, носок на себя, наклон с прямой спиной." },
  breathing: { name: "Глубокое дыхание", how: "Вдох носом на 4 счёта, выдох ртом на 6. Плечи расслаблены." },
};

export type Workout = {
  key: string;
  title: string;
  focus: string;
  main: string[];
};

const WARMUP = ["march", "arm_circles", "hip_circles"];
const COOLDOWN = ["chest_stretch", "hamstring_stretch", "breathing"];

export const WORKOUTS: Workout[] = [
  { key: "legs-1", title: "Крепкие ноги", focus: "ноги и ягодицы", main: ["squats", "lunges", "calf_raises", "glute_bridge"] },
  { key: "upper-1", title: "Руки и спина", focus: "верх тела", main: ["knee_pushups", "dips", "superman", "plank"] },
  { key: "core-1", title: "Сильный корпус", focus: "мышцы кора", main: ["plank", "bird_dog", "crunches", "side_plank"] },
  { key: "cardio-1", title: "Бодрое утро", focus: "кардио", main: ["jumping_jacks", "high_knees", "squats", "mountain_climbers"] },
  { key: "full-1", title: "Всё тело", focus: "всё тело", main: ["squats", "pushups", "bird_dog", "side_leg_raise"] },
  { key: "mobility-1", title: "Гибкость и осанка", focus: "мобильность", main: ["cat_cow", "pelvic_tilts", "side_bends", "bird_dog"] },
  { key: "legs-2", title: "Ягодицы", focus: "ноги и ягодицы", main: ["sumo_squats", "kickbacks", "clamshell", "glute_bridge"] },
  { key: "upper-2", title: "Плечи и осанка", focus: "верх тела", main: ["wall_pushups", "shoulder_rolls", "superman", "chest_stretch"] },
  { key: "core-2", title: "Пресс без скручиваний", focus: "мышцы кора", main: ["bird_dog", "standing_knee_elbow", "side_bends", "plank"] },
  { key: "cardio-2", title: "Энергия", focus: "кардио", main: ["skaters", "march", "burpees", "side_steps"] },
  { key: "full-2", title: "Тонус", focus: "всё тело", main: ["chair_squats", "knee_pushups", "kickbacks", "bird_dog"] },
  { key: "mobility-2", title: "Спина без боли", focus: "мобильность", main: ["cat_cow", "child_pose", "pelvic_tilts", "side_bends"] },
  { key: "legs-3", title: "Устойчивость", focus: "ноги и баланс", main: ["split_squats", "side_leg_raise", "calf_raises", "wall_sit"] },
  { key: "upper-3", title: "Сильные руки", focus: "верх тела", main: ["pushups", "dips", "arm_circles", "incline_plank"] },
  { key: "core-3", title: "Центр", focus: "мышцы кора", main: ["incline_plank", "bicycle", "bird_dog", "russian_twist"] },
  { key: "cardio-3", title: "Пульс", focus: "кардио", main: ["high_knees", "squats", "jumping_jacks", "march"] },
  { key: "full-3", title: "Перезагрузка", focus: "всё тело", main: ["sumo_squats", "wall_pushups", "superman", "side_steps"] },
  { key: "mobility-3", title: "Лёгкость", focus: "мобильность", main: ["hip_circles", "cat_cow", "hamstring_stretch", "breathing"] },
  { key: "legs-4", title: "Ноги-2", focus: "ноги и ягодицы", main: ["lunges", "sumo_squats", "glute_bridge", "calf_raises"] },
  { key: "upper-4", title: "Верх и кор", focus: "верх тела", main: ["knee_pushups", "plank", "wall_pushups", "bird_dog"] },
  { key: "core-4", title: "Боковые мышцы", focus: "мышцы кора", main: ["side_plank", "side_bends", "standing_knee_elbow", "clamshell"] },
  { key: "cardio-4", title: "Танцевальное кардио", focus: "кардио", main: ["side_steps", "skaters", "march", "mountain_climbers"] },
  { key: "full-4", title: "Выходной", focus: "всё тело", main: ["squats", "pushups", "lunges", "plank"] },
  { key: "mobility-4", title: "Растяжка и дыхание", focus: "мобильность", main: ["cat_cow", "child_pose", "chest_stretch", "breathing"] },
];

export type Version = "regular" | "pregnancy";

export type Step = {
  kind: "warmup" | "work" | "rest" | "cooldown";
  key: string;
  name: string;
  how: string;
  seconds: number;
  round?: number;
};

/** Упражнение для версии: при беременности — безопасная замена, в III триместре — ещё мягче. */
export function resolveExercise(key: string, version: Version, trimester: number | null): string {
  if (version === "regular") return key;
  let k = EXERCISES[key]?.pregnancyAlt ?? key;
  if ((trimester ?? 0) >= 3) {
    // Замены могут идти цепочкой (выпад → выпад с опорой → присед к стулу).
    for (let i = 0; i < 3 && EXERCISES[k]?.t3Alt; i++) k = EXERCISES[k].t3Alt as string;
  }
  return k;
}

/** Номер дня с 1970-01-01 — одна и та же тренировка у обоих в этот день. */
export function dayNumber(date: string): number {
  return Math.floor(Date.parse(`${date}T00:00:00Z`) / 86_400_000);
}

export function workoutForDay(date: string): Workout {
  return WORKOUTS[dayNumber(date) % WORKOUTS.length];
}

export function workoutByKey(key: string): Workout | undefined {
  return WORKOUTS.find((w) => w.key === key);
}

/**
 * Шаги тренировки. Обычная: 3 круга по 40 с работы / 20 с отдыха.
 * При беременности: 2 круга по 30 с работы / 30 с отдыха, комфортный темп.
 */
export function buildSteps(workout: Workout, version: Version, trimester: number | null): Step[] {
  const preg = version === "pregnancy";
  const rounds = preg ? 2 : 3;
  const work = preg ? 30 : 40;
  const rest = preg ? 30 : 20;
  const step = (kind: Step["kind"], key: string, seconds: number, round?: number): Step => {
    const k = resolveExercise(key, version, trimester);
    const ex = EXERCISES[k];
    return { kind, key: k, name: ex.name, how: ex.how, seconds, round };
  };
  const steps: Step[] = WARMUP.map((k) => step("warmup", k, 30));
  for (let r = 1; r <= rounds; r++) {
    workout.main.forEach((k, i) => {
      steps.push(step("work", k, work, r));
      const last = r === rounds && i === workout.main.length - 1;
      if (!last) steps.push({ kind: "rest", key: "rest", name: "Отдых", how: "Пройдитесь, восстановите дыхание.", seconds: rest, round: r });
    });
  }
  for (const k of COOLDOWN) steps.push(step("cooldown", k, 30));
  return steps;
}

export function totalMinutes(steps: Step[]): number {
  return Math.round(steps.reduce((s, x) => s + x.seconds, 0) / 60);
}

/** Примерный расход: обычная ~7 ккал/мин, при беременности ~4 ккал/мин. */
export function workoutKcal(minutes: number, version: Version): number {
  return Math.round(minutes * (version === "pregnancy" ? 4 : 7));
}
