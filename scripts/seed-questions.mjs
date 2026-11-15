/* One-time: copy the original 10 questions into Firestore if the `questions` collection is empty.
   Run: npm run seed:questions */
import { addDoc, collection, getDocs, limit, query, serverTimestamp } from 'firebase/firestore';
import { db } from '../src/services/firebase.js';
import { seedQuestionDocs } from '../src/data/questions.js';

const col = collection(db, 'questions');
const existing = await getDocs(query(col, limit(1)));
if (!existing.empty) {
  console.log('questions already exist – nothing to seed.');
  process.exit(0);
}
for (const { id, ...q } of seedQuestionDocs()) {
  await addDoc(col, { ...q, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  console.log('added', id, q.category, q.date);
}
console.log('done.');
process.exit(0);
