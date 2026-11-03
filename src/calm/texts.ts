import type { Language } from "../i18n";

/** Texts of the start screen and the acute-help mode. */
export interface CalmText {
  start: {
    training: { title: string; hint: string };
    stressed: { title: string; hint: string };
    panic: { title: string; hint: string };
  };
  sos: {
    title: string;
    close: string;
    inhale: string;
    exhale: string;
    since: (clock: string) => string;
    /** Short, calm sentences that change every two breaths. */
    lines: string[];
    groundingTitle: string;
    grounding: string[];
    communityTitle: string;
    communityText: string;
    soon: string;
    helpTitle: string;
    helpText: string;
    emergencyCall: string;
    talkTitle: string;
    talkText: string;
    talkCall: string;
    talkNumber: string;
    disclaimer: string;
  };
}

const de: CalmText = {
  start: {
    training: { title: "Training", hint: "Übung wählen und üben" },
    stressed: {
      title: "Ich bin gerade gestresst",
      hint: "Mit langem Ausatmen runterfahren",
    },
    panic: {
      title: "Ich habe eine Panikattacke",
      hint: "oder brauche jetzt sofort Hilfe",
    },
  },
  sos: {
    title: "Akute Hilfe",
    close: "Schließen",
    inhale: "Einatmen",
    exhale: "Ausatmen",
    since: (c) => `Du atmest seit ${c}`,
    lines: [
      "Du bist nicht allein. Atme einfach mit dem Kreis.",
      "Ein durch die Nase. Langsam aus, als würdest du eine Kerze anpusten.",
      "Das Gefühl ist heftig. Aber es geht vorbei.",
      "Panikattacken erreichen meist nach wenigen Minuten ihren Höhepunkt und lassen dann nach.",
      "Lass die Schultern sinken. Lockere deinen Kiefer.",
      "Spür deine Füße auf dem Boden.",
      "Du musst nichts richtig machen. Folge nur dem Kreis.",
      "Mit jedem langen Ausatmen wird es ein kleines bisschen ruhiger.",
    ],
    groundingTitle: "Komm im Hier und Jetzt an",
    grounding: [
      "5 Dinge, die du siehst",
      "4 Dinge, die du spürst",
      "3 Dinge, die du hörst",
      "2 Dinge, die du riechst",
      "1 Sache, die du schmeckst",
    ],
    communityTitle: "Jemand atmet mit dir",
    communityText:
      "Bald kannst du hier Menschen aus der Fluo-Community erreichen, die gerade für andere da sind und dich durch den Moment begleiten.",
    soon: "Kommt bald",
    helpTitle: "Brauchst du sofort ärztliche Hilfe?",
    helpText:
      "Bei Brustschmerzen, Atemnot, die nicht besser wird, Ohnmachtsgefühl oder wenn du in Gefahr bist: Ruf den Notruf.",
    emergencyCall: "Notruf 112",
    talkTitle: "Mit jemandem reden",
    talkText:
      "Die TelefonSeelsorge ist kostenlos, anonym und rund um die Uhr erreichbar.",
    talkCall: "0800 111 0 111",
    talkNumber: "08001110111",
    disclaimer:
      "Fluo kann dir helfen, ruhiger zu werden. Es ersetzt keine ärztliche oder psychotherapeutische Hilfe. Wenn Panikattacken öfter kommen, sprich mit deiner Ärztin oder deinem Arzt.",
  },
};

const en: CalmText = {
  start: {
    training: { title: "Training", hint: "Choose an exercise and practise" },
    stressed: {
      title: "I’m stressed right now",
      hint: "Wind down with a long exhale",
    },
    panic: {
      title: "I’m having a panic attack",
      hint: "or I need help right now",
    },
  },
  sos: {
    title: "Acute help",
    close: "Close",
    inhale: "Breathe in",
    exhale: "Breathe out",
    since: (c) => `You’ve been breathing for ${c}`,
    lines: [
      "You are not alone. Just breathe with the circle.",
      "In through your nose. Slowly out, as if blowing on a candle.",
      "The feeling is intense. But it will pass.",
      "Panic attacks usually peak within a few minutes and then ease off.",
      "Let your shoulders drop. Loosen your jaw.",
      "Feel your feet on the floor.",
      "You don’t have to do anything right. Just follow the circle.",
      "With every long exhale it gets a little calmer.",
    ],
    groundingTitle: "Come back to here and now",
    grounding: [
      "5 things you can see",
      "4 things you can feel",
      "3 things you can hear",
      "2 things you can smell",
      "1 thing you can taste",
    ],
    communityTitle: "Someone breathes with you",
    communityText:
      "Soon you’ll be able to reach people from the Fluo community who are there for others right now and stay with you through the moment.",
    soon: "Coming soon",
    helpTitle: "Do you need medical help right now?",
    helpText:
      "With chest pain, shortness of breath that doesn’t ease, feeling faint, or if you are in danger: call emergency services (112 in Europe, 911 in the US).",
    emergencyCall: "Emergency 112",
    talkTitle: "Talk to someone",
    talkText:
      "In Germany, TelefonSeelsorge is free, anonymous and available around the clock.",
    talkCall: "0800 111 0 111",
    talkNumber: "08001110111",
    disclaimer:
      "Fluo can help you calm down. It does not replace medical or psychological care. If panic attacks keep coming back, talk to your doctor.",
  },
};

export const calmText: Record<Language, CalmText> = { de, en };
