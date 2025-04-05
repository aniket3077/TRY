const fileInput = document.getElementById('csvFileInput');
const removeButton = document.getElementById("removeButton");
const fileChosen = document.getElementById('file-chosen');

fileInput.addEventListener("change", () => {
    if (fileInput.files.length > 0) { 
    // Files have been selected
     const fileCount = fileInput.files.length;
     let fileNames = "";
     for (let i = 0; i < fileCount; i++) {
         fileNames += fileInput.files[i].name;
         if (i < fileCount - 1) {
             fileNames += ", "; // Add comma and space if it's not the last file
         }
     }
     fileChosen.textContent = `Files chosen (${fileCount}): ${fileNames}`;
     removeButton.style.display = "inline-block"; // Show the Remove File button} 
    } else {
        // No file is selected
        fileChosen.textContent = "No file chosen";
        removeButton.style.display = "none"; // Hide the Remove File button
    }
});
// actualBtn.addEventListener('change', function(){
//   fileChosen.textContent = this.files[0].name
// })
// Add an event listener to the Remove File button
removeButton.addEventListener("click", () => {
    // Clear the file input and hide the Remove File button
    fileInput.value = "";
    fileChosen.textContent = "No file chosen";
    removeButton.style.display = "none";
});

document.addEventListener("DOMContentLoaded", function () {
    const csvFileInput = document.getElementById("csvFileInput");
    const uploadButton = document.getElementById("uploadButton");


    uploadButton.addEventListener("click", function () {
        const selectedFile = csvFileInput.files[0];
        let selectBoxValue = $("#user-select").val();

        if (!selectBoxValue || selectBoxValue.trim() === "") {
            // Show the error modal if the select box value is not selected
            $("#errorModal .modal-body").text("Please select a user profile.");
            $("#errorModal").modal("show");
            return;
        }

        if (selectedFile) {

            const allowedTypes = [".csv"];
            const fileType = selectedFile.name.slice(((selectedFile.name.lastIndexOf(".") - 1) >>> 0) + 2);

            if (!allowedTypes.includes("." + fileType)) {
            // Show the error modal if the file type is not allowed
            $("#errorModal .modal-body").text("Invalid File Type Please Select a CSV File...!");
            $("#errorModal").modal("show");
            return;
            }
            // Assuming you're using Django, you can use FormData to send the file to the server
            const formData = new FormData();
            formData.append("csv_file", selectedFile);
            formData.append("user_profile", selectBoxValue);
            
            // Send the file to a Django view for processing (replace with your Django view URL)
            $.ajax({
                url: "/upload_csv/", // Replace with your Django view URL
                method: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function (data) {
                    // Handle the response from the server, e.g., display a success message
                    $("#successModal").modal("show");
                },
                error: function (error) {
                    // Handle errors
                    if (error.responseJSON && error.responseJSON.error) {
                        // If the server returns an error message, show it in the modal
                        $("#errorModal .modal-body").text(error.responseJSON.error);
                    } else {
                        // If no specific error message, show a generic error message
                        $("#errorModal .modal-body").text("An error occurred while processing your request.");
                    }
                    $("#errorModal").modal("show");
                },
            });

            
        }

    });
    
    

    
});

// document.addEventListener('contextmenu', function(e) {
//     alert("Sorry, you can't view or copy source codes this way!");
//     e.preventDefault();
// });  
