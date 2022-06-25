// Avoid `console` errors in browsers that lack a console.
(function() {
  var method;
  var noop = function () {};
  var methods = [
    'assert', 'clear', 'count', 'debug', 'dir', 'dirxml', 'error',
    'exception', 'group', 'groupCollapsed', 'groupEnd', 'info', 'log',
    'markTimeline', 'profile', 'profileEnd', 'table', 'time', 'timeEnd',
    'timeline', 'timelineEnd', 'timeStamp', 'trace', 'warn'
  ];
  var stubs_length = methods.length;
  var console = (window.console = window.console || {});

  while (stubs_length--) {
    method = methods[stubs_length];
    // Only stub undefined methods.
    if (!console[method]) {
      console[method] = noop;
    }
  }
}());

(function() {
  console.log('brains online');
  let foo = "bar";
  console.log(`Welcome to ${foo}`);
}());

/*
function getData(){
    const res = fetch('https://api.agify.io/?name=keith');
    return res;
}

// Promises execution
getData().then((value) => {
    console.log('first way');
    console.log(value);
}).catch((err) => {
    console.log(err);
});

function successCallback() {
    console.log('second way');
}

function failureCallback() {
    console.log('it failed');
}

// That can also be written as
const promise = getData(); 
promise.then(successCallback, failureCallback)

*/











