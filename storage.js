(function(root){'use strict';
// Same DB and key as v0.4; writes resolve only after the transaction commits.
function put(db,value){return new Promise((resolve,reject)=>{const tx=db.transaction('projects','readwrite');tx.objectStore('projects').put(value,'current');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('保存失敗'));tx.onabort=()=>reject(tx.error||new Error('保存中断'));});}
root.PonponStorage={put,message:e=>(e?.name==='QuotaExceededError'?'保存容量が足りません。':'自動保存できません。')+'作品管理からJSONバックアップを保存し、不要な画像を減らしてください。'};
})(globalThis);
