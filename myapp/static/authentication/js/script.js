var close = document.getElementsByClassName("closebtn");
var i;

for (i = 0; i < close.length; i++) {
    close[i].onclick = function() {
        var div = this.parentElement;
        div.style.opacity = "0";
        setTimeout(function() {
            div.style.display = "none";
}, 600);
    };

    (function(index) {
setTimeout(function() {
    var div = close[index].parentElement;
    div.style.opacity = "0";
    setTimeout(function() {
            div.style.display = "none";
}, 600);
}, 8000);
    })(i);
}

// document.addEventListener('contextmenu', function(e) {
//     alert("Sorry, you can't view or copy source codes this way!");
//     e.preventDefault();
// });  

function togglePassword() {
    var passwordInput = document.getElementById("pass1");
    var toggleButton = document.querySelector(".toggle-password");
    
    if (passwordInput.type === "password") {
passwordInput.type = "text";
toggleButton.innerHTML = '<i class="fas fa-eye"></i>';
} else {
passwordInput.type = "password";
toggleButton.innerHTML = '<i class="fas fa-eye-slash"></i>';
}
}