console.log('worker loaded');


onmessage = function(e) {
  console.log('Message received from main script: ' + e.data);
  //var workerResult = 'Result: ' + (e);
  //console.log('Posting message back to main script');
  //postMessage(workerResult);
  loadData(e.data);
};

loadData = function(id){
console.log('load: ' + id);

// call route from here?



};

