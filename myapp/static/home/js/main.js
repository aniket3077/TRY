// document.addEventListener('contextmenu', function(e) {
//     alert("Sorry, you can't view or copy source codes this way!");
//     e.preventDefault();
// });  


let list = document.querySelectorAll(".navigation li");

function activeLink() {
  list.forEach((item) => {
    item.classList.remove("hovered");
  });
  this.classList.add("hovered");
}

function removeHovered() {
  list.forEach((item) => {
      item.classList.remove("hovered");
  });
}

list.forEach(
  (item) => {
     item.addEventListener("mouseover", activeLink);
     item.addEventListener("focusout", removeHovered);
  }
  );



let toggle = document.querySelector(".toggle");
let navigation = document.querySelector(".navigation");
let main = document.querySelector(".main");

toggle.onclick = function () {
  navigation.classList.toggle("active");
  main.classList.toggle("active");
};

function filterTable() {
  var input, filter, table, tr, td, i, j, txtValue;
  input = document.getElementById("myInput");
  filter = input.value.toUpperCase();
  table = document.querySelector(".table-container table");
  tr = table.getElementsByTagName("tr");

  for (i = 1; i < tr.length; i++) {
      var displayRow = false;
      td = tr[i].getElementsByTagName("td");

      for (j = 0; j < td.length; j++) {
          if (td[j]) {
              txtValue = td[j].textContent || td[j].innerText;
              if (txtValue.toUpperCase().indexOf(filter) > -1) {
                  displayRow = true;
                  break;
              }
          }
      }

      if (displayRow) {
          tr[i].style.display = "";
      } else {
          tr[i].style.display = "none";
      }
  }
}

var originalOrder = [];

document.addEventListener("DOMContentLoaded", function () {
    saveOriginalOrder();
});

function saveOriginalOrder() {
    var table = document.querySelector("table");
    var rows = table ? table.rows : null;

    if (!rows) {
        return;
    }

    for (var i = 1; i < rows.length; i++) {
        originalOrder.push(rows[i]);
    }
}

function resetSrNumbers() {
    var table = document.querySelector("table");
    var rows = table ? table.rows : null;

    if (!rows) {
        return;
    }

    for (var i = 1; i < rows.length; i++) {
        rows[i].cells[0].textContent = i;
    }
}

function parseDate(dateString) {
    var dateComponents = dateString.split(/[\s,]+/);

    var month = dateComponents[0].slice(0, 3); 
    var day = dateComponents[1].replace(',', ''); 
    var year = dateComponents[2];
    var time = dateComponents[3];
    var ampm = dateComponents[4];

    var monthMap = {
        "Jan": "01", "Feb": "02", "Mar": "03", "Apr": "04", "May": "05", "Jun": "06",
        "Jul": "07", "Aug": "08", "Sep": "09", "Oct": "10", "Nov": "11", "Dec": "12"
    };
    var monthNumeric = monthMap[month];

    var hour = parseInt(time.split(":")[0]);
    if (ampm === "p.m.") {
        hour += 12;
        if (hour >= 24) {
            hour = 0; 
        }
    }
    var hourString = hour.toString().padStart(2, '0');
    var minutes = time.split(":")[1];

    var formattedDate = year + '-' + monthNumeric + '-' + day + ' ' + hourString + ':' + minutes + ':00';
    return new Date(formattedDate).getTime();
}

function sortTable(columnIndex, sortOrder) {
    var table, rows, switching, i, shouldSwitch;
    table = document.querySelector("table");
    switching = true;
    rows = table ? table.rows : null;

    if (!rows) {
        return;
    }

    while (switching) {
        switching = false;

        for (i = 1; i < rows.length - 1; i++) {
            shouldSwitch = false;
            var x = rows[i].getElementsByTagName("td")[columnIndex];
            var y = rows[i + 1].getElementsByTagName("td")[columnIndex];

            var xValue, yValue;

            if ([2, 3, 5].includes(columnIndex)) {
                xValue = parseDate(x.innerHTML);
                yValue = parseDate(y.innerHTML);
              
            }
            else if ([0, 4].includes(columnIndex)) {
                xValue = parseFloat(x.innerHTML);
                yValue = parseFloat(y.innerHTML);
            }
            else {
                xValue = x.innerHTML.toLowerCase();
                yValue = y.innerHTML.toLowerCase();
            }

            if (sortOrder === "asc" ? xValue > yValue : xValue < yValue) {
                shouldSwitch = true;
                break;
            }
        }

        if (shouldSwitch) {
            rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
            switching = true;
        }
    }

    resetSrNumbers();
}




function handleSortChange(value) {
    var columnIndex = 1; 
    var sortOrder = "asc";

    if (value === "az") {
        sortOrder = "asc";
    } else if (value === "za") {
        sortOrder = "desc";
    } else if (value === "latest") {
        columnIndex = 2;
        sortOrder = "desc"; 
    }else if (value === "access_given") {
        columnIndex = 2;
        sortOrder = "desc"; 
    }

    sortTable(columnIndex, sortOrder);
}


function copyImageLink(button, imageUrl) {
        var domain = window.location.origin;
    
        var fullUrl = domain + imageUrl;
	fullUrl = fullUrl.replace(/\/media\/user_uploaded/, "/static");
        var input = document.createElement('input');
        input.style.position = 'fixed';
        input.style.opacity = 0;
        input.value = fullUrl;
        document.body.appendChild(input);
        
        input.select();
        input.setSelectionRange(0, 99999); 
        
        document.execCommand('copy');
        
        document.body.removeChild(input);
        button.textContent = 'Copied!';

        setTimeout(function() {
            button.textContent = 'Copy Link';
        }, 3000);
    }

const ImgInput = document.getElementById('imageInput');
const ImgRemove = document.getElementById("ImgRemove");
const ImgChosen = document.getElementById('file-chosen');

if (ImgInput){
ImgInput.addEventListener("change", () => {
    if (ImgInput.files.length > 0) { 
        let invalidFile = false;
        for (const file of ImgInput.files) {
            if (!file.type.startsWith('image/')) {
                invalidFile = true;
                break;
            }
        }
        
        if (invalidFile) {
            alert('Please select only image files.');
            ImgInput.value = ''; 
            ImgChosen.textContent = "No file chosen";
            ImgRemove.style.display = "none"; 
        } else {
            const fileCount = ImgInput.files.length;
            ImgChosen.textContent = `Files chosen: ${fileCount}`;
            ImgRemove.style.display = "inline-block"; 
        }
    } else {
        // No file is selected
        ImgChosen.textContent = "No file chosen";
        ImgRemove.style.display = "none"; 
    }
});
if (ImgRemove){
ImgRemove.addEventListener("click", () => {
    
    ImgInput.value = "";
    ImgChosen.textContent = "No file chosen";
    ImgRemove.style.display = "none";
});
}
}
function selectCheckboxes() {
    const checkboxes = document.querySelectorAll('.select-checkbox');
    const selectCount = document.getElementById('selectCountInput').value;

    for (let i = 0; i < checkboxes.length && i < selectCount; i++) {
        checkboxes[i].checked = true;
    }
}

function selectCheckboxes() {
    const checkboxes = document.querySelectorAll('.select-checkbox');
    const selectCountInput = document.getElementById('selectCountInput');
    const selectCount = parseInt(selectCountInput.value) || 1;
    
    // First uncheck all
    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = false;
    }
    
    // Then check the specified number
    for (let i = 0; i < checkboxes.length && i < selectCount; i++) {
        checkboxes[i].checked = true;
    }
}

function toggleSelectAllCheckboxes() {
    const checkboxes = document.querySelectorAll('.select-checkbox');
    let allChecked = true;

    for (let i = 0; i < checkboxes.length; i++) {
        if (!checkboxes[i].checked) {
            allChecked = false;
            break;
        }
    }

    for (let i = 0; i < checkboxes.length; i++) {
        checkboxes[i].checked = !allChecked;
    }

    const button = document.getElementById('selectAllButton');
    button.textContent = allChecked ? 'Select All' : 'Deselect All';
}

function checkInput(input) {
    if (parseInt(input.value) > parseInt(input.max)) {
        input.value = input.max;
    }
}

function deleteSelected() {
    var checkboxes = document.querySelectorAll('input[name="imageCheckbox"]:checked');
    var imageIds = [];

    checkboxes.forEach(function(checkbox) {
        imageIds.push(checkbox.value);
    });

    if (imageIds.length === 0) {
        alert("No images selected for deletion.");
        return; 
    }

    var confirmDelete = confirm("Are you sure you want to delete the selected images?");
    
    if (confirmDelete) {
        
        var xhr = new XMLHttpRequest();
        xhr.open("POST", "/delete_images", true);
        xhr.setRequestHeader("X-CSRFToken", window.csrfToken);
    

        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && xhr.status === 200) {
                var response = JSON.parse(xhr.responseText);
                alert(response.message);
                
                location.reload();
                
                

            }
            
        };
        
        xhr.send(JSON.stringify({image_ids: imageIds}));
    }
}

function exportSelected() {
    var checkboxes = document.querySelectorAll('input[name="imageCheckbox"]:checked');
    var imageIds = [];

    checkboxes.forEach(function(checkbox) {
        imageIds.push(checkbox.value);
    });

    if (imageIds.length === 0) {
        alert("No images selected for export.");
        return; 
    }

    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/export_image_urls", true);
    xhr.setRequestHeader("X-CSRFToken", "{{ csrf_token }}");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                var blob = new Blob([xhr.response], { type: 'text/csv' });
                var url = window.URL.createObjectURL(blob);
                var a = document.createElement('a');
                a.href = url;
                a.download = 'selected_image_urls.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Failed to export image URLs.");
            }
        }
    };
    
    xhr.send(JSON.stringify({image_ids: imageIds}));
}


 $(document).ready(function() {
  showMobileOverlayIfNeeded();

  $('.dropdown-toggle').dropdown(); 
});


// Mobile device detection and overlay message
function showMobileOverlayIfNeeded() {
    var isMobile = window.innerWidth < 900 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
        if (!document.getElementById('mobileOverlay')) {
            var overlay = document.createElement('div');
            overlay.id = 'mobileOverlay';
            overlay.style = `
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                width: 100vw; height: 100vh;
                background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
                backdrop-filter: blur(12px);
                z-index: 99999;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
            `;
            overlay.innerHTML = `
                <div style="background: rgba(255,255,255,0.85); border-radius: 24px; box-shadow: 0 8px 32px rgba(59,130,246,0.12); padding: 2.5rem 1.5rem; max-width: 90vw;">
                    <svg width="64" height="64" fill="none" viewBox="0 0 24 24" style="margin-bottom: 1rem;"><rect width="24" height="24" rx="12" fill="#38bdf8"/><path d="M7 17h10M9 21h6M12 3v12" stroke="#fff" stroke-width="2" stroke-linecap="round"/></svg>
                    <h2 style="color: #0ea5e9; font-family: 'Poppins',sans-serif; font-weight: 700; margin-bottom: 0.5rem;">Desktop Only</h2>
                    <p style="color: #334155; font-size: 1.1rem; margin-bottom: 1.5rem;">Please open this page on a desktop or laptop to view the organization chart.</p>
                </div>
            `;
            document.body.appendChild(overlay);
            document.body.style.overflow = 'hidden';
        }
    } else {
        var overlay = document.getElementById('mobileOverlay');
        if (overlay) {
            overlay.remove();
            document.body.style.overflow = '';
        }
    }
}

// // Run on load and on resize/orientation change
window.addEventListener('resize', showMobileOverlayIfNeeded);
window.addEventListener('orientationchange', showMobileOverlayIfNeeded);