const button = document.querySelector("#button1");
button.addEventListener('click', changeText);

const heading = document.querySelector("h1")

function changeText() {
    heading.textContent = 'Tell me a secret...';
}

const x = document.querySelector(".button2");
x.addEventListener('click', changeTextSize);

function changeTextSize() {
    document.body.style.fontSize = "50px";
}