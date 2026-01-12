import { PowerVerb } from "../types";

export const powerVerbsData: PowerVerb[] = [
  // Presente Indicativo (Regular)
  { verb: "hablar", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["hablo"], regular: true },
  { verb: "hablar", tense: "presente", mode: "indicativo", pronoun: "tú", answer: ["hablas"], regular: true },
  { verb: "hablar", tense: "presente", mode: "indicativo", pronoun: "él/ella", answer: ["habla"], regular: true },
  { verb: "hablar", tense: "presente", mode: "indicativo", pronoun: "nosotros", answer: ["hablamos"], regular: true },
  { verb: "comer", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["como"], regular: true },
  { verb: "comer", tense: "presente", mode: "indicativo", pronoun: "tú", answer: ["comes"], regular: true },
  { verb: "comer", tense: "presente", mode: "indicativo", pronoun: "ellos", answer: ["comen"], regular: true },
  { verb: "vivir", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["vivo"], regular: true },
  { verb: "vivir", tense: "presente", mode: "indicativo", pronoun: "nosotros", answer: ["vivimos"], regular: true },
  
  // Presente Indicativo (Irregular)
  { verb: "ser", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["soy"], regular: false },
  { verb: "ser", tense: "presente", mode: "indicativo", pronoun: "tú", answer: ["eres"], regular: false },
  { verb: "estar", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["estoy"], regular: false },
  { verb: "tener", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["tengo"], regular: false },
  { verb: "ir", tense: "presente", mode: "indicativo", pronoun: "yo", answer: ["voy"], regular: false },
  { verb: "ir", tense: "presente", mode: "indicativo", pronoun: "nosotros", answer: ["vamos"], regular: false },

  // Pretérito Indefinido
  { verb: "hablar", tense: "indefinido", mode: "indicativo", pronoun: "yo", answer: ["hablé"], regular: true },
  { verb: "comer", tense: "indefinido", mode: "indicativo", pronoun: "tú", answer: ["comiste"], regular: true },
  { verb: "vivir", tense: "indefinido", mode: "indicativo", pronoun: "él/ella", answer: ["vivió"], regular: true },
  
  // Futuro Simple
  { verb: "hablar", tense: "futuro simple", mode: "indicativo", pronoun: "yo", answer: ["hablaré"], regular: true },
  { verb: "comer", tense: "futuro simple", mode: "indicativo", pronoun: "tú", answer: ["comerás"], regular: true },
  { verb: "hacer", tense: "futuro simple", mode: "indicativo", pronoun: "yo", answer: ["haré"], regular: false },
];
