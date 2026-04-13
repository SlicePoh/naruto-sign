export const JUTSU_REFERENCE = {
  intro: {
    title: 'What is Jutsu?',
    body:
      'Jutsu are techniques powered by chakra. Shinobi mould physical and spiritual energy into chakra, shape it with control and intent, and release it as combat, movement, utility, healing, or illusion-based skills.',
    highlights: [
      'Chakra control',
      'Chakra moulding',
      'Hand seals',
      'Special traits or bloodlines',
      'Physical skill and training',
    ],
  },
  origins: {
    title: 'Origins of Jutsu',
    body:
      'Jutsu traces back to Ninshu, the chakra practice created by Hagoromo Otsutsuki. Ninshu was meant to connect people spiritually, build empathy, and create peace. Over time, its techniques evolved into Ninjutsu — the weaponised, shinobi combat use of chakra.',
  },
  chakra: {
    title: 'Core Chakra Mechanics',
    steps: [
      'Combine physical energy and spiritual energy to create chakra.',
      'Mould chakra internally.',
      'Knead and control it with precision.',
      'Use hand seals when required.',
      'Release the technique.',
    ],
    notes: [
      'Poor chakra control weakens or fails techniques.',
      'Efficient hand seals improve precision and output.',
      'Some advanced jutsu require no hand seals.',
      'Taijutsu often uses little or no direct chakra release.',
    ],
  },
  mainTypes: [
    {
      title: 'Ninjutsu',
      description:
        'The broadest class of chakra-based techniques. Includes elemental attacks, clone techniques, transformation, summoning, and chakra-enhanced tools.',
    },
    {
      title: 'Genjutsu',
      description:
        'Illusionary techniques that manipulate the target’s senses. Opponents may experience false sights, sounds, pain, paralysis, or distorted reality.',
    },
    {
      title: 'Taijutsu',
      description:
        'Physical combat using speed, strength, reflexes, stamina, and martial skill. Usually requires no hand seals.',
    },
  ],
  subTypes: [
    'Barrier Ninjutsu',
    'Bukijutsu',
    'Chakra Absorption Techniques',
    'Chakra Flow',
    'Clone Techniques',
    'Cooperation Ninjutsu',
    'Fuinjutsu',
    'Hiden Techniques',
    'Juinjutsu',
    'Kenjutsu',
    'Kinjutsu',
    'Medical Ninjutsu',
    'Nintaijutsu',
    'Regeneration Techniques',
    'Scientific Ninja Tool Techniques',
    'Senjutsu',
    'Shinjutsu',
    'Shurikenjutsu',
    'Space-Time Ninjutsu',
  ],
  ranks: [
    { rank: 'Academy Student', level: 'Academy basics', description: 'Fundamental techniques taught to new students.' },
    { rank: 'Genin', level: 'Entry-level', description: 'Entry-level shinobi techniques.' },
    { rank: 'Chūnin', level: 'Intermediate', description: 'Intermediate techniques; talented genin may learn some early.' },
    { rank: 'Jōnin', level: 'Advanced', description: 'High-level techniques that usually require solid reserves and control.' },
    { rank: 'Sannin', level: 'Elite', description: 'Advanced techniques that demand mastery and precision.' },
    { rank: 'Kage', level: 'Legendary', description: 'Secret, dangerous, destructive, or unique techniques.' },
  ],
  bloodlines: [
    {
      title: 'Kekkei Genkai',
      description: 'Inherited bloodline abilities such as Sharingan, Byakugan, Ice Release, or Wood Release.',
    },
    {
      title: 'Kekkei Tota',
      description: 'Advanced nature combination beyond standard bloodline limits, such as Dust Release.',
    },
    {
      title: 'Kekkei Mora',
      description: 'Abilities tied directly to Kaguya Otsutsuki and her lineage.',
    },
    {
      title: 'Dojutsu',
      description: 'Eye-based powers that grant perception boosts, tracking, copying, genjutsu, or dimensional abilities.',
    },
  ],
  quickSummary: [
    ['Ninjutsu', 'Chakra techniques'],
    ['Genjutsu', 'Illusions'],
    ['Taijutsu', 'Physical combat'],
    ['Fuinjutsu', 'Sealing'],
    ['Senjutsu', 'Natural energy techniques'],
    ['Kinjutsu', 'Forbidden techniques'],
    ['Dojutsu', 'Eye powers'],
    ['Kekkei Genkai', 'Bloodline abilities'],
    ['Space-Time Ninjutsu', 'Teleportation / dimension control'],
    ['Medical Ninjutsu', 'Healing'],
  ],
} as const;
