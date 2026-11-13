import type { Game } from '../types';
import { createCategory, createGame, createQuestion, createTeam, defaultFinal, defaultTheme, FONT_OPTIONS } from './factory';

export interface TemplateDef {
  key: string;
  name: string;
  description: string;
  emoji: string;
  build: () => Game;
}

type Q = [prompt: string, answer: string, extra?: Partial<ReturnType<typeof createQuestion>>];

function cat(name: string, description: string, qs: Q[], values = [100, 200, 300, 400, 500]) {
  const c = createCategory(name, 0);
  c.description = description;
  c.questions = qs.map(([prompt, answer, extra], i) => createQuestion(values[i] ?? (i + 1) * 100, { prompt, answer, ...extra }));
  return c;
}

export function buildDemoGame(): Game {
  const svgImage =
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><rect width="300" height="200" fill="#87ceeb"/><circle cx="240" cy="50" r="28" fill="#ffd93b"/><polygon points="20,190 120,40 220,190" fill="#8b8b8b"/><polygon points="95,78 120,40 145,78 132,72 120,82 108,72" fill="#fff"/><polygon points="130,190 210,80 290,190" fill="#6b6b6b"/></svg>`,
    );
  return createGame({
    title: 'SSA Demo Night',
    description: 'A ready-to-play sample game showing every question type, Daily Doubles and Final Jeopardy.',
    notes: 'Demo game — feel free to duplicate it and make it your own.',
    categories: [
      cat('Science', 'Facts about the natural world', [
        ['This planet is known as the Red Planet.', 'Mars', { altAnswers: ['What is Mars'], explanation: 'Iron oxide (rust) on its surface gives Mars its reddish color.', tags: ['space'] }],
        ['H2O is the chemical formula for this substance.', 'Water', { hint: 'You drink it every day.' }],
        ['This force keeps us on the ground.', 'Gravity', { links: [{ label: 'NASA: What is gravity?', url: 'https://spaceplace.nasa.gov/what-is-gravity/' }] }],
        ['The powerhouse of the cell.', 'Mitochondria', { altAnswers: ['Mitochondrion'], dailyDouble: true }],
        ['The speed of light is roughly this many kilometers per second.', '300,000', { altAnswers: ['300000', '299,792', '299792'], difficulty: 'hard' }],
      ]),
      cat('Geography', 'Places around the globe', [
        ['The largest ocean on Earth.', 'Pacific Ocean', { altAnswers: ['Pacific'] }],
        ['Identify the type of landform pictured.', 'Mountain', { type: 'image', media: { image: svgImage }, altAnswers: ['Mountains', 'Mountain range'] }],
        ['Which continent is Egypt located in?', 'Africa', { type: 'multiple_choice', choices: ['Asia', 'Africa', 'Europe', 'South America'], correctChoice: 1 }],
        ['The capital city of Canada.', 'Ottawa'],
        ['This is the longest river in South America.', 'Amazon', { altAnswers: ['Amazon River'] }],
      ]),
      cat('True or False', 'Decide if the statement is true', [
        ['Bats are blind.', 'False', { type: 'true_false', correctChoice: 1, explanation: 'Most bats can see; many also use echolocation.' }],
        ['A group of crows is called a murder.', 'True', { type: 'true_false', correctChoice: 0 }],
        ['Lightning never strikes the same place twice.', 'False', { type: 'true_false', correctChoice: 1 }],
        ['Octopuses have three hearts.', 'True', { type: 'true_false', correctChoice: 0 }],
        ['The Great Wall of China is visible from the Moon with the naked eye.', 'False', { type: 'true_false', correctChoice: 1 }],
      ]),
      cat('Fill the Blank', 'Complete the phrase', [
        ['An apple a day keeps the ______ away.', 'Doctor', { type: 'fill_blank' }],
        ['Actions speak louder than ______.', 'Words', { type: 'fill_blank' }],
        ['The early bird catches the ______.', 'Worm', { type: 'fill_blank' }],
        ["Don't count your ______ before they hatch.", 'Chickens', { type: 'fill_blank' }],
        ['When in Rome, do as the ______ do.', 'Romans', { type: 'fill_blank' }],
      ]),
      cat('History', 'Moments that shaped the world', [
        ['The first person to walk on the Moon.', 'Neil Armstrong', { altAnswers: ['Armstrong'] }],
        ['The year World War II ended.', '1945'],
        ['This ancient wonder stood in Alexandria and guided ships.', 'The Lighthouse of Alexandria', { altAnswers: ['Lighthouse', 'Pharos', 'Pharos of Alexandria'] }],
        ['The document signed in 1215 limiting the power of the English king.', 'Magna Carta'],
        ['This empire was ruled by Mansa Musa.', 'Mali Empire', { altAnswers: ['Mali'] }],
      ]),
      cat('Potpourri', 'A little bit of everything', [
        ['How many sides does a hexagon have?', '6', { altAnswers: ['Six'] }],
        ['How many keys are on a standard piano?', '88', { altAnswers: ['Eighty-eight'] }],
        ['The primary colors of light are red, green and this.', 'Blue'],
        ['This is the only letter that does not appear in any U.S. state name.', 'Q'],
        ['In computing, what does "CPU" stand for?', 'Central Processing Unit'],
      ]),
    ],
    finalRound: {
      ...defaultFinal(),
      category: 'Famous Inventions',
      question: 'Patented in 1876, this device allowed people to talk across long distances for the first time.',
      answer: 'The telephone',
    },
    teams: [createTeam(0, 'The Brainiacs'), createTeam(1, 'Quiz Wizards'), createTeam(2, 'Trivia Titans')],
  });
}

export function buildPunjabiCategory() {
  return cat('Punjabi Culture', 'Music, food, language and land of Punjab', [
    ["What is Punjab's most famous folk dance, danced to the dhol at harvest time?", 'Bhangra'],
    ['What is the big double-sided barrel drum at the centre of Bhangra music?', 'Dhol'],
    ['What are the two main dishes in the classic Punjabi meal makki di roti and sarson da saag?', 'Cornmeal flatbread and mustard greens', { altAnswers: ['Corn flatbread and mustard greens', 'Corn roti and mustard greens'] }],
    ['In which script is Punjabi written in India, and in which script in Pakistan?', 'Gurmukhi in India, Shahmukhi in Pakistan', { altAnswers: ['Gurmukhi and Shahmukhi'] }],
    ['What does the name Punjab mean, and name the five rivers it refers to?', 'Land of five rivers: Beas, Chenab, Jhelum, Ravi, Sutlej', { altAnswers: ['Land of five rivers'] }],
  ]);
}

export function buildCanadaCategory() {
  return cat('Canada', 'History, geography and symbols of Canada', [
    ['What is the capital city of Canada?', 'Ottawa'],
    ['What leaf appears in the centre of the Canadian flag?', 'Maple leaf', { altAnswers: ['Maple', 'Red maple leaf'] }],
    ["What are Canada's two official languages?", 'English and French', { altAnswers: ['French and English'] }],
    ['How many provinces and how many territories does Canada have?', '10 provinces and 3 territories', { altAnswers: ['10 and 3', 'Ten provinces and three territories', 'Ten and three'] }],
    ['In what year did Confederation create the Dominion of Canada?', '1867', { explanation: 'Confederation took effect on July 1, 1867 — now celebrated as Canada Day.' }],
  ]);
}

export function buildSikhiCategory() {
  return cat('Sikhi', 'Gurus, beliefs and traditions of the Sikh faith', [
    ['What is a Sikh place of worship called?', 'Gurdwara', { altAnswers: ['Gurudwara', 'Gurdwara Sahib'] }],
    ['Who was the founder of Sikhi and the first Sikh Guru?', 'Guru Nanak Dev Ji', { altAnswers: ['Guru Nanak', 'Guru Nanak Dev'] }],
    ['What is the free community kitchen in every gurdwara, where everyone sits and eats together as equals?', 'Langar'],
    ['Which Guru created the Khalsa at Anandpur Sahib on Vaisakhi in 1699?', 'Guru Gobind Singh Ji', { altAnswers: ['Guru Gobind Singh'] }],
    ['Name the Five Ks (Panj Kakaar) worn by initiated Sikhs.', 'Kesh, Kangha, Kara, Kachera, Kirpan', {
      altAnswers: ['Kesh Kangha Kara Kachera Kirpan'],
      explanation: 'Kesh (uncut hair), Kangha (wooden comb), Kara (steel bracelet), Kachera (cotton undergarment) and Kirpan (ceremonial sword).',
    }],
  ]);
}

export function buildSportsCategory() {
  return cat('Sports', 'Games, athletes and championships', [
    ['How many players does each soccer team have on the field at one time?', '11', { altAnswers: ['Eleven'] }],
    ['In which sport do teams score a touchdown?', 'Football', { altAnswers: ['American football', 'Canadian football', 'Gridiron football'] }],
    ['What trophy is awarded each year to the champion of the NHL?', 'The Stanley Cup', { altAnswers: ['Stanley Cup'] }],
    ['Which Canadian invented the game of basketball in 1891?', 'James Naismith', { altAnswers: ['Naismith', 'Dr. James Naismith'] }],
    ['Name the four Grand Slam tournaments in tennis.', 'Australian Open, French Open, Wimbledon, US Open', {
      altAnswers: ['Australian Open, Roland Garros, Wimbledon, US Open'],
    }],
  ]);
}

export function buildPopCultureCategory() {
  return cat('Pop Culture & Entertainment', 'Movies, music, TV and celebrities', [
    ['What is the name of the school of witchcraft and wizardry that Harry Potter attends?', 'Hogwarts', { altAnswers: ['Hogwarts School of Witchcraft and Wizardry'] }],
    ['In which Disney animated film does Elsa sing "Let It Go"?', 'Frozen'],
    ['Which Toronto-born rapper got his start acting on the TV show "Degrassi: The Next Generation"?', 'Drake', { altAnswers: ['Aubrey Graham', 'Aubrey Drake Graham'] }],
    ['In 2023, which singer and actor became the first Punjabi artist to perform at the Coachella music festival?', 'Diljit Dosanjh', { altAnswers: ['Diljit'] }],
    ['Which 2009 James Cameron film is the highest-grossing movie of all time?', 'Avatar'],
  ]);
}

/** The $600 (hardest) clue for each SSA category, keyed by category name. */
export const SSA_600: Record<string, { prompt: string; answer: string; altAnswers?: string[]; explanation?: string }> = {
  Kinesiology: {
    prompt: "This sense lets you know where your body parts are and how they are moving without looking at them.",
    answer: 'Proprioception',
    altAnswers: ['Kinesthesia', 'Kinaesthesia'],
  },
  Criminology: {
    prompt: 'This Italian thinker wrote "On Crimes and Punishments" in 1764 and is considered the founder of the classical school of criminology.',
    answer: 'Cesare Beccaria',
    altAnswers: ['Beccaria'],
  },
  'General Knowledge': {
    prompt: 'This is the smallest country in the world by area.',
    answer: 'Vatican City',
    altAnswers: ['The Vatican', 'Vatican'],
  },
  'Math & Science': {
    prompt: 'This number, approximately 6.022 × 10²³, is the number of particles in one mole of a substance.',
    answer: "Avogadro's number",
    altAnswers: ['Avogadro number', 'Avogadro constant', "Avogadro's constant"],
  },
  'Punjabi Culture': {
    prompt: 'This 18th-century Punjabi poet wrote the most famous version of the tragic love story "Heer Ranjha".',
    answer: 'Waris Shah',
  },
  Canada: {
    prompt: "This is Canada's newest territory, created in 1999.",
    answer: 'Nunavut',
  },
  Sikhi: {
    prompt: 'This opening verse of the Guru Granth Sahib Ji begins with the words "Ik Onkar".',
    answer: 'Mool Mantar',
    altAnswers: ['Mul Mantar', 'Mool Mantra', 'Mul Mantra'],
  },
  Sports: {
    prompt: "This country has won the most FIFA men's World Cups, with five titles.",
    answer: 'Brazil',
  },
  'Pop Culture & Entertainment': {
    prompt: 'This South Korean survival drama, released in 2021, became the most-watched series in Netflix history.',
    answer: 'Squid Game',
  },
};

export function buildSsaGame(): Game {
  const game = buildSsaBase();
  for (const c of game.categories) {
    const clue = SSA_600[c.name];
    if (clue) c.questions.push(createQuestion(600, { ...clue, difficulty: 'hard' }));
  }
  return game;
}

function buildSsaBase(): Game {
  return createGame({
    title: 'SSA Jeopardy Night',
    description: 'Kinesiology, Criminology, General Knowledge, Math & Science, Punjabi Culture, Canada, Sikhi, Sports, and Pop Culture & Entertainment.',
    categories: [
      cat('Kinesiology', 'Human movement, muscles and exercise science', [
        ['This tendon connects the calf muscles to the heel bone.', 'Achilles tendon', { altAnswers: ['Achilles', 'Calcaneal tendon'] }],
        ['The largest muscle in the human body.', 'Gluteus maximus', { altAnswers: ['Glutes', 'Gluteus'] }],
        ['This molecule is the direct source of energy for muscle contraction.', 'ATP', { altAnswers: ['Adenosine triphosphate'] }],
        ['This plane of motion divides the body into left and right halves.', 'Sagittal plane', { altAnswers: ['Sagittal'] }],
        ['The type of muscle contraction in which the muscle lengthens while under tension, like lowering a dumbbell.', 'Eccentric contraction', { altAnswers: ['Eccentric'] }],
      ]),
      cat('Criminology', 'Crime, law and criminal behaviour', [
        ['A serious crime, such as murder or robbery, that is more severe than a misdemeanor.', 'Felony', { altAnswers: ['Indictable offence', 'Indictable offense'], explanation: 'In Canada the equivalent term is an indictable offence.' }],
        ['This Latin term means "guilty mind" — the criminal intent behind an act.', 'Mens rea'],
        ['This Italian physician, often called the father of modern criminology, argued that criminals were "born".', 'Cesare Lombroso', { altAnswers: ['Lombroso'] }],
        ['This theory by Wilson and Kelling says visible signs of disorder encourage more serious crime.', 'Broken windows theory', { altAnswers: ['Broken windows'], dailyDouble: true }],
        ["Robert Merton's theory that crime results when people cannot reach society's goals through legitimate means.", 'Strain theory', { altAnswers: ['Strain', 'Anomie theory'] }],
      ]),
      cat('General Knowledge', 'A little bit of everything', [
        ['The number of continents on Earth.', '7', { altAnswers: ['Seven'] }],
        ['The playwright who wrote "Romeo and Juliet".', 'William Shakespeare', { altAnswers: ['Shakespeare'] }],
        ['The longest river in Africa.', 'The Nile', { altAnswers: ['Nile', 'Nile River'] }],
        ['The official currency of Japan.', 'Yen', { altAnswers: ['Japanese yen'] }],
        ['The artist who painted the ceiling of the Sistine Chapel.', 'Michelangelo'],
      ]),
      cat('Math & Science', 'Numbers, nature and the laws of the universe', [
        ['The value of pi rounded to two decimal places.', '3.14'],
        ['The chemical symbol for gold.', 'Au'],
        ['The square root of 144.', '12', { altAnswers: ['Twelve'] }],
        ['The process plants use to turn sunlight, water and carbon dioxide into food.', 'Photosynthesis'],
        ['The derivative of x² with respect to x.', '2x', { altAnswers: ['2 x', 'Two x'] }],
      ]),
      buildPunjabiCategory(),
      buildCanadaCategory(),
      buildSikhiCategory(),
      buildSportsCategory(),
      buildPopCultureCategory(),
    ],
    finalRound: {
      ...defaultFinal(),
      category: 'The Human Body',
      question: 'Located in the neck, this is the only bone in the human body not connected to any other bone.',
      answer: 'The hyoid bone',
    },
  });
}

export const TEMPLATES: TemplateDef[] = [
  {
    key: 'ssa',
    name: 'SSA Jeopardy Night',
    description: 'Ready to play: Kinesiology, Criminology, General Knowledge, Math & Science, Punjabi Culture, Canada, Sikhi, Sports, Pop Culture.',
    emoji: '🎓',
    build: buildSsaGame,
  },
  {
    key: 'blank-classic',
    name: 'Classic Board',
    description: '6 categories × 5 rows, values 100–500, Final Jeopardy enabled.',
    emoji: '🎯',
    build: () => createGame({ title: 'New Classic Game' }),
  },
  {
    key: 'quick',
    name: 'Quick Round',
    description: '4 categories × 4 rows, 20-second timer. Great for short sessions.',
    emoji: '⚡',
    build: () => {
      const g = createGame({ title: 'Quick Round' });
      g.categories = Array.from({ length: 4 }, (_, i) => createCategory(`Category ${i + 1}`, 4, [100, 200, 300, 400]));
      g.settings.timerSeconds = 20;
      return g;
    },
  },
  {
    key: 'double',
    name: 'Double Values',
    description: '6 × 5 board with doubled values (200–1000) and 2 random Daily Doubles.',
    emoji: '💰',
    build: () => {
      const g = createGame({ title: 'Double Round' });
      g.categories = Array.from({ length: 6 }, (_, i) => createCategory(`Category ${i + 1}`, 5, [200, 400, 600, 800, 1000]));
      g.settings.randomDailyDoubles = true;
      g.settings.randomDailyDoubleCount = 2;
      return g;
    },
  },
  {
    key: 'classroom',
    name: 'Classroom (Kind Mode)',
    description: 'No negative scoring, no timer, playful font. Perfect for kids.',
    emoji: '🍎',
    build: () => {
      const g = createGame({ title: 'Classroom Review' });
      g.categories = Array.from({ length: 5 }, (_, i) => createCategory(`Topic ${i + 1}`, 5));
      g.settings.negativeScoring = false;
      g.settings.timerEnabled = false;
      g.theme = { ...defaultTheme(), fontFamily: FONT_OPTIONS[5].value, layout: 'modern', boardColor: '#0b1f4d', tileColor: '#1e40af' };
      return g;
    },
  },
  {
    key: 'demo',
    name: 'Demo Game',
    description: 'Fully written sample game with every question type. Play it right away.',
    emoji: '🎮',
    build: buildDemoGame,
  },
];
