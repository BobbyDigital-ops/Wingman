/* Wingman character bible v1: defined pilots, not random recruit rolls. */
(()=>{'use strict';
 const roster=[
  {
    "id": "ace-01",
    "name": "Algernon \"Biscuit\" Wibblethorpe",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "reverse",
    "archetype": "Daring",
    "bio": "A moustached aristocrat who treats danger as afternoon tea.",
    "attributes": {
      "manoeuvrability": 91,
      "gunnery": 72,
      "engine": 63
    },
    "portrait": 0,
    "legacyId": "pilot-0"
  },
  {
    "id": "ace-02",
    "name": "Reginald \"Bumfluff\" Bottomley",
    "faction": "Allies",
    "plane": "heavy",
    "signature": "harden",
    "archetype": "Stalwart",
    "bio": "A cheerful bruiser with the turn radius of a pub.",
    "attributes": {
      "manoeuvrability": 48,
      "gunnery": 87,
      "engine": 76
    },
    "portrait": 1,
    "legacyId": "pilot-1"
  },
  {
    "id": "ace-03",
    "name": "Horace \"Chocs\" Bumblesnatch",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "roll",
    "archetype": "Scrappy",
    "bio": "An eccentric flyer who survives by sheer nerve.",
    "attributes": {
      "manoeuvrability": 84,
      "gunnery": 82,
      "engine": 71
    },
    "portrait": 2,
    "legacyId": "pilot-2"
  },
  {
    "id": "ace-04",
    "name": "Nigel \"Noodles\" Fotheringay-Phipps",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "cut",
    "archetype": "Evasive",
    "bio": "Long-limbed, anxious and surprisingly impossible to hit.",
    "attributes": {
      "manoeuvrability": 94,
      "gunnery": 62,
      "engine": 81
    },
    "portrait": 3,
    "legacyId": "pilot-3"
  },
  {
    "id": "ace-05",
    "name": "Percival \"Pip\" Puddington",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "deadeye",
    "archetype": "Sharpshooter",
    "bio": "A tiny perfectionist obsessed with elegant shooting.",
    "attributes": {
      "manoeuvrability": 76,
      "gunnery": 95,
      "engine": 64
    },
    "portrait": 4,
    "legacyId": "pilot-4"
  },
  {
    "id": "ace-06",
    "name": "Archibald \"Tally-Ho\" Crumpet",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "dive",
    "archetype": "Daredevil",
    "bio": "A theatrical gentleman with more courage than sense.",
    "attributes": {
      "manoeuvrability": 92,
      "gunnery": 76,
      "engine": 88
    },
    "portrait": 5,
    "legacyId": "pilot-5"
  },
  {
    "id": "ace-07",
    "name": "Cedric \"Wobbles\" Wobblebottom",
    "faction": "Allies",
    "plane": "heavy",
    "signature": "smoke",
    "archetype": "Trickster",
    "bio": "His unreliable tactics are bewilderingly effective.",
    "attributes": {
      "manoeuvrability": 56,
      "gunnery": 82,
      "engine": 80
    },
    "portrait": 6,
    "legacyId": "pilot-6"
  },
  {
    "id": "ace-08",
    "name": "Rupert \"Twitch\" Tinklebury",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "reverse",
    "archetype": "Reckless",
    "bio": "A nervous bundle of reflexes and strong tea.",
    "attributes": {
      "manoeuvrability": 96,
      "gunnery": 70,
      "engine": 74
    },
    "portrait": 7,
    "legacyId": "pilot-7"
  },
  {
    "id": "ace-09",
    "name": "Barnaby \"Bangers\" Smedley-Smythe",
    "faction": "Allies",
    "plane": "heavy",
    "signature": "harden",
    "archetype": "Tank",
    "bio": "A booming officer who believes every problem needs cannons.",
    "attributes": {
      "manoeuvrability": 49,
      "gunnery": 93,
      "engine": 66
    },
    "portrait": 8,
    "legacyId": "pilot-8"
  },
  {
    "id": "ace-10",
    "name": "Gerald \"Goggles\" Pemberton",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "roll",
    "archetype": "Balanced",
    "bio": "A reliable old hand who never removes his flying goggles.",
    "attributes": {
      "manoeuvrability": 83,
      "gunnery": 82,
      "engine": 83
    },
    "portrait": 9,
    "legacyId": "pilot-9"
  },
  {
    "id": "ace-11",
    "name": "Winston \"Whiskers\" Blenkinsop",
    "faction": "Allies",
    "plane": "bomber",
    "signature": "deadeye",
    "archetype": "Veteran",
    "bio": "A pipe-smoking navigator with a legendary moustache.",
    "attributes": {
      "manoeuvrability": 55,
      "gunnery": 94,
      "engine": 72
    },
    "portrait": 10,
    "legacyId": "pilot-10"
  },
  {
    "id": "ace-12",
    "name": "Edmund \"Pork Pie\" Plunkett",
    "faction": "Allies",
    "plane": "heavy",
    "signature": "harden",
    "archetype": "Endurance",
    "bio": "Large, unflappable and usually thinking about lunch.",
    "attributes": {
      "manoeuvrability": 43,
      "gunnery": 84,
      "engine": 93
    },
    "portrait": 11,
    "legacyId": "pilot-11"
  },
  {
    "id": "ace-13",
    "name": "Bertie \"Sparks\" Featherstone",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "dive",
    "archetype": "Speedster",
    "bio": "A former mechanic who can wring speed from anything.",
    "attributes": {
      "manoeuvrability": 91,
      "gunnery": 73,
      "engine": 97
    },
    "portrait": 12,
    "legacyId": "pilot-12"
  },
  {
    "id": "ace-14",
    "name": "Stanley \"Spanner\" Frobisher",
    "faction": "Allies",
    "plane": "bomber",
    "signature": "cut",
    "archetype": "Engineer",
    "bio": "Knows precisely how long an engine can survive abuse.",
    "attributes": {
      "manoeuvrability": 64,
      "gunnery": 68,
      "engine": 98
    },
    "portrait": 13,
    "legacyId": "pilot-13"
  },
  {
    "id": "ace-15",
    "name": "Cecil \"Pudding\" Cumberbatch",
    "faction": "Allies",
    "plane": "heavy",
    "signature": "smoke",
    "archetype": "Defender",
    "bio": "Polite until someone damages his aeroplane.",
    "attributes": {
      "manoeuvrability": 61,
      "gunnery": 85,
      "engine": 84
    },
    "portrait": 14,
    "legacyId": "pilot-14"
  },
  {
    "id": "ace-16",
    "name": "Montague \"Moths\" Pritchard",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "reverse",
    "archetype": "Acrobat",
    "bio": "Flies upside-down to avoid reading his instruments.",
    "attributes": {
      "manoeuvrability": 97,
      "gunnery": 70,
      "engine": 76
    },
    "portrait": 15,
    "legacyId": "pilot-15"
  },
  {
    "id": "ace-17",
    "name": "Fergus \"Ferret\" MacTavish",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "deadeye",
    "archetype": "Hunter",
    "bio": "Patient, sharp-eyed and devastating on a tail.",
    "attributes": {
      "manoeuvrability": 89,
      "gunnery": 92,
      "engine": 75
    },
    "portrait": 16,
    "legacyId": "pilot-16"
  },
  {
    "id": "ace-18",
    "name": "Douglas \"Doughnut\" Haversham",
    "faction": "Allies",
    "plane": "bomber",
    "signature": "smoke",
    "archetype": "Support",
    "bio": "Always brings extra supplies, sometimes including bombs.",
    "attributes": {
      "manoeuvrability": 63,
      "gunnery": 81,
      "engine": 89
    },
    "portrait": 17,
    "legacyId": "pilot-17"
  },
  {
    "id": "ace-19",
    "name": "Frederick \"Fingers\" Wainwright",
    "faction": "Allies",
    "plane": "fighter",
    "signature": "roll",
    "archetype": "Precision",
    "bio": "Quiet and calm until the guns open up.",
    "attributes": {
      "manoeuvrability": 88,
      "gunnery": 92,
      "engine": 76
    },
    "portrait": 18,
    "legacyId": "pilot-18"
  },
  {
    "id": "ace-20",
    "name": "Wilfred \"Walrus\" Thistledown",
    "faction": "Allies",
    "plane": "heavy",
    "signature": "harden",
    "archetype": "Brawler",
    "bio": "A bushy-moustached veteran with a forgiving aircraft.",
    "attributes": {
      "manoeuvrability": 50,
      "gunnery": 91,
      "engine": 83
    },
    "portrait": 19,
    "legacyId": "pilot-19"
  },
  {
    "id": "ace-21",
    "name": "Otto \"Schnapps\" Krüger",
    "faction": "Axis",
    "plane": "bf110",
    "signature": "harden",
    "archetype": "Ironclad",
    "bio": "A gruff veteran who prefers armour to aerobatics.",
    "attributes": {
      "manoeuvrability": 47,
      "gunnery": 86,
      "engine": 80
    },
    "portrait": 20,
    "legacyId": "pilot-20"
  },
  {
    "id": "ace-22",
    "name": "Friedrich \"Der Fuchs\" Bauer",
    "faction": "Axis",
    "plane": "bf109",
    "signature": "reverse",
    "archetype": "Fox",
    "bio": "A cunning hunter who waits for the perfect turn.",
    "attributes": {
      "manoeuvrability": 92,
      "gunnery": 77,
      "engine": 79
    },
    "portrait": 21,
    "legacyId": "pilot-21"
  },
  {
    "id": "ace-23",
    "name": "Heinrich \"Blitz\" Vogel",
    "faction": "Axis",
    "plane": "bf109",
    "signature": "dive",
    "archetype": "Interceptor",
    "bio": "A fast, impatient ace who loves a steep dive.",
    "attributes": {
      "manoeuvrability": 93,
      "gunnery": 82,
      "engine": 95
    },
    "portrait": 22,
    "legacyId": "pilot-22"
  },
  {
    "id": "ace-24",
    "name": "Kurt \"Korken\" Weber",
    "faction": "Axis",
    "plane": "bf109",
    "signature": "roll",
    "archetype": "Escape Artist",
    "bio": "His opponents swear he vanishes between bursts.",
    "attributes": {
      "manoeuvrability": 96,
      "gunnery": 71,
      "engine": 80
    },
    "portrait": 23,
    "legacyId": "pilot-23"
  },
  {
    "id": "ace-25",
    "name": "Ernst \"Dachs\" Neumann",
    "faction": "Axis",
    "plane": "bf110",
    "signature": "harden",
    "archetype": "Bulwark",
    "bio": "A stubborn heavy-fighter pilot nicknamed the badger.",
    "attributes": {
      "manoeuvrability": 53,
      "gunnery": 91,
      "engine": 75
    },
    "portrait": 24,
    "legacyId": "pilot-24"
  },
  {
    "id": "ace-26",
    "name": "Hans \"Kuckuck\" Fischer",
    "faction": "Axis",
    "plane": "he111",
    "signature": "smoke",
    "archetype": "Ambusher",
    "bio": "Appears at awkward moments with an unwelcome surprise.",
    "attributes": {
      "manoeuvrability": 56,
      "gunnery": 88,
      "engine": 83
    },
    "portrait": 25,
    "legacyId": "pilot-25"
  },
  {
    "id": "ace-27",
    "name": "Ludwig \"Eule\" Richter",
    "faction": "Axis",
    "plane": "bf109",
    "signature": "deadeye",
    "archetype": "Night Owl",
    "bio": "An observant marksman with extraordinary patience.",
    "attributes": {
      "manoeuvrability": 78,
      "gunnery": 98,
      "engine": 75
    },
    "portrait": 26,
    "legacyId": "pilot-26"
  },
  {
    "id": "ace-28",
    "name": "Rudolf \"Wraith\" Stein",
    "faction": "Axis",
    "plane": "bf110",
    "signature": "cut",
    "archetype": "Shadow",
    "bio": "A silent adversary famous for sudden reversals.",
    "attributes": {
      "manoeuvrability": 72,
      "gunnery": 90,
      "engine": 78
    },
    "portrait": 27,
    "legacyId": "pilot-27"
  },
  {
    "id": "ace-29",
    "name": "Max \"Donner\" Beck",
    "faction": "Axis",
    "plane": "bf110",
    "signature": "harden",
    "archetype": "Thunder",
    "bio": "A booming pilot whose attack runs are relentless.",
    "attributes": {
      "manoeuvrability": 58,
      "gunnery": 97,
      "engine": 79
    },
    "portrait": 28,
    "legacyId": null
  },
  {
    "id": "ace-30",
    "name": "Wilhelm \"Graf\" Adler",
    "faction": "Axis",
    "plane": "bf109",
    "signature": "dive",
    "archetype": "Aristocrat",
    "bio": "Elegant, confident and inclined to overcommit.",
    "attributes": {
      "manoeuvrability": 88,
      "gunnery": 84,
      "engine": 91
    },
    "portrait": 29,
    "legacyId": null
  },
  {
    "id": "ace-31",
    "name": "Dieter \"Schatten\" Falk",
    "faction": "Axis",
    "plane": "bf109",
    "signature": "smoke",
    "archetype": "Ghost",
    "bio": "Specialises in vanishing into cloud and smoke.",
    "attributes": {
      "manoeuvrability": 90,
      "gunnery": 83,
      "engine": 81
    },
    "portrait": 30,
    "legacyId": null
  },
  {
    "id": "ace-32",
    "name": "Günther \"Kessel\" Hoffmann",
    "faction": "Axis",
    "plane": "he111",
    "signature": "deadeye",
    "archetype": "Bombardier",
    "bio": "A meticulous bomber commander with a sharp eye.",
    "attributes": {
      "manoeuvrability": 52,
      "gunnery": 96,
      "engine": 87
    },
    "portrait": 31,
    "legacyId": null
  }
];
 window.WingmanRoster=Object.freeze(roster.map(p=>Object.freeze({...p,attributes:Object.freeze(p.attributes)})));
})();
