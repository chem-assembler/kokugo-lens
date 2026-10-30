'use strict';
// 不備・候補・正しい読みを区別できるか。問題データの復唱ではなく否定対照を使う。
const assert = require('assert');
const {checkReadings} = require('./yomi-rules.js');
let count = 0;
function run(tokens, order){
  return checkReadings([{id:'対照',tokens,order:order || tokens.map((_,i) => i)}]);
}
for (const [c, wrong, right] of [['相','あい','あひ'],['相','しょう','しやう'],['自','みずか','みづか'],['道','どう','だう'],['臥','ぐあ','ぐわ']]){
  assert(run([{c,yomi:wrong}]).errors.length); count++;
  assert.equal(run([{c,yomi:right}]).errors.length,0); count++;
}
assert(run([{c:'相',yomi:'あふ'}]).errors.length); count++;
for (const field of ['yomi','okuri']){
  const r=run([{c:'未登録字',[field]:field==='okuri'?'ショウ':'しょう'}]);
  assert.equal(r.errors.length,0); assert.equal(r.candidates.length,1); count++;
}
const reread = run([{c:'未登録字',reread:{first:{yomi:'しょう'},second:{okuri:'ヨウ',kana:true}}}]);
assert.equal(reread.candidates.length,2); count++;
assert.equal(run([{c:'未登録字',yomi:'しょう',role:'placed'}]).candidates.length,0); count++;
for(const [a,b,ya,yb,okuri] of [['如','何','いか','ん','セン'],['所','以','ゆゑ','ん','ノ'],['嗟','夫','あ','あ',''],['孰','与','いづ','れ','ゾ'],['孰','若','いづ','れ','ゾ'],['何','如','い','かん',''],['所','謂','い','はゆる','']]){
  assert.equal(run([{c:a,yomi:ya},{c:b,yomi:yb,okuri}]).errors.length,0); count++;
  assert(run([{c:a,yomi:ya},{c:b,yomi:yb+yb,okuri}]).errors.length); count++;
  assert(run([{c:a,yomi:ya},{c:b,yomi:'',okuri}]).errors.length); count++;
}
assert(run([{c:'如',yomi:'いか'},{c:'何',yomi:'せん',okuri:'セン'}]).errors.length); count++;
const separated = run([{c:'以',yomi:'もつ',okuri:'テ'},{c:'為',yomi:'な',okuri:'ス'},{c:'神',yomi:'かみ',okuri:'ト'}],[0,2,1]);
assert.equal(separated.errors.length,0); assert.equal(separated.candidates.length,1); count++;
assert.equal(run([{c:'以',yomi:'おも'},{c:'為',yomi:'へらく'}]).errors.length,0); count++;
assert(run([{c:'中',yomi:'ちゅう'}]).errors.length); count++;
assert.equal(run([{c:'中',yomi:'ちう'}]).errors.length,0); count++;
assert(run([{c:'上',okuri:'ウエニ'}]).errors.length); count++;
assert.equal(run([{c:'愛',yomi:'あい'}]).errors.length,0); count++;
assert(run([{c:'相',okuri:'アイ'}]).errors.length); count++;
assert(run([{c:'自',reread:{first:{yomi:'みづか'},second:{okuri:'ミズカラ',kana:true}}}]).errors.length); count++;
assert.equal(run([{c:'陽',yomi:'やう'}]).errors.length,0); count++;
// 東韻の大字形と尤韻の形を混ぜない。正しい字音でも未確認形は候補に残す。
for (const [c,right] of [['口','こう'],['同','どう'],['宋','そう'],['崩','ほう'],['擁','よう']]){
  const r=run([{c,yomi:right}]);
  assert.equal(r.errors.length,0); assert.equal(r.candidates.length,0); count++;
}
assert.equal(run([{c:'口',yomi:'こうべ'}]).errors.length,0); count++;
assert.equal(run([{c:'口',yomi:'こうべ'}]).candidates.length,1); count++;
assert.equal(run([{c:'口',okuri:'コウ'}]).candidates.length,1); count++;
assert.equal(run([{c:'擁',yomi:'やう'}]).errors.length,0); count++;
const confirmedReread=run([{c:'同',reread:{first:{yomi:'どう'},second:{yomi:'どう'}}}]);
assert.equal(confirmedReread.candidates.length,0); count++;
assert(run([{c:'相',yomi:'しゃう'}]).errors.length); count++;
console.log('歴史的仮名づかい・熟語の否定対照など '+count+' 件合格');
