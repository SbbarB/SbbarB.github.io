const customName = document.getElementById('customname');
const randomize = document.querySelector('.randomize');
const story = document.querySelector('.story');

function randomValueFromArray(array){
  const random = Math.floor(Math.random()*array.length);
  return array[random];
}

const storyText = 'It was mid summer and hotter than the sun outside, so :insertx: went for a swim in the oceans brisk water. Eventually, they had drifted beyond the shoreline and towards :inserty:, where they began to panic. Fighting to stay afloat in the now freezing water, :insertz:. Bob saw the whole thing, but was not surprised — :insertx: weighs 300 pounds, and it was 94 fahrenheit.';
const insertx = ['Tommy Jo', 'Lil homie', 'Sister Gene', 'Bob'];
const inserty = ['Gilligans Island', 'Africa', 'Guantanamo Bay'];
const insertz = ['when suddenly the coast guard appeared', 'when they found a broken door to float on', 'when hypothermia began to win'];

randomize.addEventListener('click', result);

function result() {

    let newStory = storyText;
    const xItem = randomValueFromArray(insertx)
    const yItem = randomValueFromArray(inserty)
    const zItem = randomValueFromArray(insertz)

    newStory = newStory.replaceAll(':insertx:', xItem).replace(':inserty:', yItem).replace(':insertz:', zItem);


  if(customName.value !== '') {
    const name = customName.value;
    newStory = newStory.replaceAll('Bob', name)

  }

  if(document.getElementById("uk").checked) {
    const weight = Math.round(300/14) + ' stone';
    const temperature =  Math.round((94-32)*(5/9)) + ' centigrade';

    newStory = newStory.replace('300 pounds', weight);
    newStory = newStory.replace('94 fahrenheit', temperature);


  }

  story.textContent = newStory;
  story.style.visibility = 'visible';
}