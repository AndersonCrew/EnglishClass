import type { AssignmentDraft, BuilderQuestion, BuilderTask } from "./types";

type LessonSeed = {
  code: string;
  title: string;
  description: string;
  level: 1 | 2 | 3 | 4;
  listenText: string;
  listenQuestion: string;
  listenOptions: [string, string, string];
  listenAnswer: number;
  readingStatement: string;
  readingAnswer: boolean;
  writingPrompt: string;
  writingAccepted: string[];
  orderWords: string[];
  orderAnswer: string[];
  speakingQuestions: [string, string];
};

const lessons: LessonSeed[] = [
  { code: "G3-01", title: "Bài 1 · Toys", description: "Từ vựng đồ chơi và mẫu câu I have / She has.", level: 1, listenText: "I have a red kite.", listenQuestion: "Bạn nhỏ có đồ chơi gì?", listenOptions: ["A kite", "A train", "A plane"], listenAnswer: 0, readingStatement: "She has two planes.", readingAnswer: true, writingPrompt: "Điền từ: He ___ a teddy bear.", writingAccepted: ["has"], orderWords: ["a", "kite.", "I", "have"], orderAnswer: ["I", "have", "a", "kite."], speakingQuestions: ["What toys do you have?", "How many toys do you have?"] },
  { code: "G3-02", title: "Bài 2 · My Pets", description: "Vật nuôi và mẫu câu How many ... do you have?", level: 1, listenText: "I have three cats.", listenQuestion: "Bạn nhỏ có bao nhiêu con mèo?", listenOptions: ["Two", "Three", "Four"], listenAnswer: 1, readingStatement: "The girl has four dogs.", readingAnswer: false, writingPrompt: "Điền từ: How ___ cats do you have?", writingAccepted: ["many"], orderWords: ["do", "you", "dogs", "have?", "How many"], orderAnswer: ["How many", "dogs", "do", "you", "have?"], speakingQuestions: ["Do you have any pets?", "How many cats or dogs do you have?"] },
  { code: "G3-03", title: "Bài 3 · At the Zoo", description: "Động vật sở thú và mẫu câu I can see ...", level: 1, listenText: "I can see a tiger.", listenQuestion: "Em nghe thấy con vật nào?", listenOptions: ["A tiger", "A monkey", "A horse"], listenAnswer: 0, readingStatement: "The monkey is climbing.", readingAnswer: true, writingPrompt: "Điền từ: I can ___ a monkey.", writingAccepted: ["see"], orderWords: ["see", "a", "can", "I", "tiger."], orderAnswer: ["I", "can", "see", "a", "tiger."], speakingQuestions: ["What animals can you see?", "What is the monkey doing?"] },
  { code: "G3-04", title: "Bài 4 · My Family", description: "Thành viên gia đình và mẫu câu Who’s that?", level: 1, listenText: "Who's that? It's my sister.", listenQuestion: "Người được nhắc đến là ai?", listenOptions: ["Mother", "Sister", "Brother"], listenAnswer: 1, readingStatement: "This is my father.", readingAnswer: true, writingPrompt: "Điền từ: It’s ___ mother.", writingAccepted: ["my"], orderWords: ["that?", "Who's"], orderAnswer: ["Who's", "that?"], speakingQuestions: ["Who's in your family?", "How old is your brother or sister?"] },
  { code: "G3-05", title: "Bài 5 · Jobs", description: "Nghề nghiệp và mẫu câu What’s his/her job?", level: 2, listenText: "What's his job? He's a farmer.", listenQuestion: "Người đàn ông làm nghề gì?", listenOptions: ["Teacher", "Driver", "Farmer"], listenAnswer: 2, readingStatement: "She is a singer.", readingAnswer: true, writingPrompt: "Điền từ: What’s her ___?", writingAccepted: ["job"], orderWords: ["a", "He", "driver.", "is"], orderAnswer: ["He", "is", "a", "driver."], speakingQuestions: ["What's your mother's job?", "What job do you like?"] },
  { code: "G3-06", title: "Bài 6 · Food and Drinks", description: "Đồ ăn, thức uống và lời mời Would you like ...?", level: 2, listenText: "Would you like some milk? Yes, please.", listenQuestion: "Bạn nhỏ được mời món gì?", listenOptions: ["Milk", "Rice", "Chicken"], listenAnswer: 0, readingStatement: "Would you like some juice? Yes, please.", readingAnswer: true, writingPrompt: "Điền từ: Would you like ___ rice?", writingAccepted: ["some"], orderWords: ["some", "Would", "juice?", "you", "like"], orderAnswer: ["Would", "you", "like", "some", "juice?"], speakingQuestions: ["What food do you like?", "Would you like some milk?"] },
  { code: "G3-07", title: "Bài 7 · Fun Activities", description: "Hoạt động và thì hiện tại tiếp diễn.", level: 2, listenText: "The girl is cycling.", listenQuestion: "Bạn gái đang làm gì?", listenOptions: ["Running", "Reading", "Cycling"], listenAnswer: 2, readingStatement: "The parrot is counting.", readingAnswer: true, writingPrompt: "Điền từ: She is ___.", writingAccepted: ["cycling"], orderWords: ["doing?", "What", "you", "are"], orderAnswer: ["What", "are", "you", "doing?"], speakingQuestions: ["What are you doing?", "What is your friend doing?"] },
  { code: "G3-08", title: "Bài 8 · Toys and Pets Challenge", description: "Kết hợp đồ chơi, vật nuôi và have/has.", level: 3, listenText: "My sister has two planes and a cat.", listenQuestion: "Câu nào đúng?", listenOptions: ["She has two planes and a cat.", "She has a kite and two cats.", "She has two trains and a dog."], listenAnswer: 0, readingStatement: "He have a dog.", readingAnswer: false, writingPrompt: "Chọn từ đúng: My brother ___ a dog.", writingAccepted: ["has"], orderWords: ["parrots", "do", "have?", "you", "How many"], orderAnswer: ["How many", "parrots", "do", "you", "have?"], speakingQuestions: ["Tell me about your toys.", "Tell me about a pet you like."] },
  { code: "G3-09", title: "Bài 9 · Animal Detective", description: "Kết hợp động vật, số lượng và hành động.", level: 3, listenText: "I can see two monkeys. They are climbing.", listenQuestion: "Em nghe được thông tin nào?", listenOptions: ["Two monkeys are climbing.", "Three monkeys are swinging.", "Two tigers are running."], listenAnswer: 0, readingStatement: "The monkeys are climbing.", readingAnswer: true, writingPrompt: "Điền từ: I can see two ___.", writingAccepted: ["monkeys"], orderWords: ["monkey", "is", "The", "swinging."], orderAnswer: ["The", "monkey", "is", "swinging."], speakingQuestions: ["Describe an animal at the zoo.", "How many animals can you see?"] },
  { code: "G3-10", title: "Bài 10 · Family and Jobs", description: "Kết hợp gia đình, tuổi và nghề nghiệp.", level: 3, listenText: "This is my mother. She is a teacher.", listenQuestion: "Mẹ của bạn nhỏ làm nghề gì?", listenOptions: ["A teacher", "A farmer", "A singer"], listenAnswer: 0, readingStatement: "His father is a driver.", readingAnswer: true, writingPrompt: "Điền từ: What’s your mother’s ___?", writingAccepted: ["job"], orderWords: ["is", "My", "farmer.", "father", "a"], orderAnswer: ["My", "father", "is", "a", "farmer."], speakingQuestions: ["Tell me about your family.", "What's your father's or mother's job?"] },
  { code: "G3-11", title: "Bài 11 · Picnic Day", description: "Kết hợp đồ ăn, thức uống và hoạt động.", level: 3, listenText: "The children are eating chicken and drinking juice.", listenQuestion: "Các bạn nhỏ đang làm gì?", listenOptions: ["Eating and drinking", "Running and cycling", "Reading and counting"], listenAnswer: 0, readingStatement: "The boy is drinking milk.", readingAnswer: true, writingPrompt: "Điền từ: Would you like some ___?", writingAccepted: ["juice", "milk", "rice", "chicken"], orderWords: ["reading.", "am", "I"], orderAnswer: ["I", "am", "reading."], speakingQuestions: ["What would you like to eat?", "What are the children doing?"] },
  { code: "G3-12", title: "Bài 12 · Final Review", description: "Bài tổng hợp mô phỏng nội dung kiểm tra cuối năm.", level: 4, listenText: "My brother has a dog. He is playing with it in the park.", listenQuestion: "Câu nào đúng với đoạn nghe?", listenOptions: ["The boy has a dog.", "The girl has a cat.", "The boy can see a tiger."], listenAnswer: 0, readingStatement: "Would you like some chicken? Yes, please.", readingAnswer: true, writingPrompt: "Điền từ: How many dogs do you ___?", writingAccepted: ["have"], orderWords: ["a", "see", "monkey.", "can", "I"], orderAnswer: ["I", "can", "see", "a", "monkey."], speakingQuestions: ["Introduce yourself and your family.", "Look around and describe what someone is doing."] },
];

function question(base: Omit<BuilderQuestion, "clientId" | "instruction">): BuilderQuestion {
  return { clientId: crypto.randomUUID(), instruction: "", ...base };
}

function buildTasks(seed: LessonSeed, lessonNumber: number): BuilderTask[] {
  const lessonImage = `/images/grade3/lesson-${String(lessonNumber).padStart(2, "0")}.webp`;
  const readingImage = `/images/grade3/questions/reading-${String(lessonNumber).padStart(2, "0")}.webp`;
  const options = seed.listenOptions.map((label, index) => ({ id: `o${index + 1}`, label }));
  const shuffledWords = seed.orderWords.map((label, index) => ({ id: `w${index + 1}`, label }));
  const answerIds = seed.orderAnswer.map((word) => shuffledWords.find((item) => item.label === word)?.id).filter((value): value is string => Boolean(value));
  return [
    { clientId: crypto.randomUUID(), skill: "LISTENING", title: "Listening · Nghe và chọn", instruction: "Bấm nút nghe, sau đó chọn đáp án đúng.", category: "Vocabulary & comprehension", questions: [
      question({ type: "MULTIPLE_CHOICE", prompt: seed.listenQuestion, imagePath: null, points: 2, config: { options, speakText: seed.listenText }, answerKey: { optionId: options[seed.listenAnswer].id } }),
    ] },
    { clientId: crypto.randomUUID(), skill: "READING", title: "Reading · Đọc hiểu", instruction: "Đọc kỹ câu và chọn Đúng hoặc Sai.", category: "Sentence patterns", questions: [
      question({ type: "TRUE_FALSE", prompt: seed.readingStatement, imagePath: readingImage, points: 2, config: {}, answerKey: { value: seed.readingAnswer } }),
    ] },
    { clientId: crypto.randomUUID(), skill: "WRITING", title: "Writing · Viết câu", instruction: "Hoàn thành câu và sắp xếp từ theo đúng thứ tự.", category: "Grammar", questions: [
      question({ type: "FILL_BLANK", prompt: seed.writingPrompt, imagePath: lessonImage, points: 1, config: {}, answerKey: { accepted: seed.writingAccepted, caseSensitive: false } }),
      question({ type: "ORDERING", prompt: "Sắp xếp các từ để tạo thành câu đúng.", imagePath: null, points: 1, config: { items: shuffledWords }, answerKey: { itemIds: answerIds } }),
    ] },
    { clientId: crypto.randomUUID(), skill: "SPEAKING", title: "Speaking · Em hãy nói", instruction: "Bấm thu âm và trả lời bằng câu đầy đủ.", category: "Speaking practice", questions: seed.speakingQuestions.map((prompt) =>
      question({ type: "TEXT_INPUT", prompt, imagePath: lessonImage, points: 2, config: { responseMode: "AUDIO" }, answerKey: {} })
    ) },
  ];
}

export type Grade3LessonDraft = AssignmentDraft & { code: string; level: 1 | 2 | 3 | 4; sequenceIndex: number };

export function getGrade3LearningPath(classroomId: string): Grade3LessonDraft[] {
  return lessons.map((seed, index) => ({
    classroomId,
    code: seed.code,
    level: seed.level,
    sequenceIndex: index + 1,
    title: seed.title,
    description: seed.description,
    dueAt: "",
    showResultsAfterSubmit: false,
    tasks: buildTasks(seed, index + 1),
  }));
}

export const grade3LessonCount = lessons.length;
