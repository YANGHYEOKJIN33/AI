import { el, fill } from './dom.js';
import { currentStep } from '../app/lesson.js';
export function mountRoom(root, store) {
  store.subscribe((s) => { if (s.mode !== 'algo') fill(root, el('div.placeholder', {}, currentStep(s).title)); });
}
