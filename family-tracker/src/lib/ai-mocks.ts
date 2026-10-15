// Заготовленные ответы для автотестов (AI_MOCK=1) — без обращения к API.

const ing = (name: string, amount: number, unit: string, department: string) => ({ name, amount, unit, department });

const dish = (key: string, title: string, kcal: number, ingredients: ReturnType<typeof ing>[]) => ({
  key,
  title,
  existing_recipe_title: null,
  cook_minutes: 30,
  servings: 3,
  kcal_per_serving: kcal,
  protein: 20,
  fat: 12,
  carbs: 40,
  ingredients,
  steps: "Подготовить продукты.\nПриготовить.\nПодать.",
});

export const MOCKS = {
  food_text: {
    items: [
      { name: "Плов", grams: 250, unit: "г", kcal: 420, protein: 14, fat: 18, carbs: 50, caffeine_mg: 0, pregnancy_note: null },
      { name: "Чай с молоком", grams: 200, unit: "мл", kcal: 40, protein: 1.5, fat: 1.5, carbs: 5, caffeine_mg: 40, pregnancy_note: null },
    ],
    comment: null,
  },
  food_photo: {
    items: [
      { name: "Суши с лососем", grams: 200, unit: "г", kcal: 300, protein: 14, fat: 7, carbs: 45, caffeine_mg: 0, pregnancy_note: "Сырая рыба — при беременности лучше избегать" },
    ],
    comment: "Порция оценена по фото примерно",
  },
  menu: {
    dishes: [
      dish("oat", "Овсянка с яблоком", 320, [ing("Овсяные хлопья", 180, "г", "Бакалея"), ing("Яблоко", 2, "шт", "Овощи и фрукты"), ing("Молоко", 600, "мл", "Молочное и яйца")]),
      dish("soup", "Куриный суп с овощами", 280, [ing("Куриное филе", 400, "г", "Мясо и птица"), ing("Картофель", 300, "г", "Овощи и фрукты"), ing("Морковь", 100, "г", "Овощи и фрукты")]),
      dish("buckwheat", "Гречка с говядиной", 520, [ing("Гречка", 250, "г", "Бакалея"), ing("Говядина", 450, "г", "Мясо и птица"), ing("Лук репчатый", 1, "шт", "Овощи и фрукты")]),
    ],
    plan: [0, 1, 2, 3, 4, 5, 6].flatMap((day) => [
      { day, meal: "breakfast", dish_key: "oat" },
      { day, meal: "lunch", dish_key: "soup" },
      { day, meal: "dinner", dish_key: "buckwheat" },
    ]),
    notes: "Суп и гречку удобно готовить сразу на 2 дня.",
  },
  swap: {
    dish: dish("fish", "Запечённая треска с овощами", 350, [ing("Филе трески", 450, "г", "Рыба"), ing("Кабачок", 300, "г", "Овощи и фрукты")]),
  },
} as const;
