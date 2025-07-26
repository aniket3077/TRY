const fileInput = document.getElementById('csvFileInput');
const removeButton = document.getElementById("removeButton");
const fileChosen = document.getElementById('file-chosen');

fileInput.addEventListener("change", () => {
    const files = fileInput.files;
    if (files.length > 0) {
        // Files have been selected
        const fileNames = Array.from(files).map(file => file.name).join(', ');
        fileChosen.textContent = `Files chosen (${files.length}): ${fileNames}`;
        removeButton.style.display = "inline-block"; // Show the Remove File button
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
    const uploadButton = document.getElementById("uploadButton");

    uploadButton.addEventListener("click", function () {
        const selectedFiles = fileInput.files;
        let selectBoxValue = $("#user-select").val();

        if (!selectBoxValue || selectBoxValue.trim() === "") {
            // Show the error modal if the select box value is not selected
            $("#errorModal .modal-body").text("Please select a user profile.");
            $("#errorModal").modal("show");
            return;
        }

        if (selectedFiles.length > 0) {
            const allowedTypes = [".csv"];
            const formData = new FormData();
            formData.append("user_profile", selectBoxValue);

            for (const file of selectedFiles) {
                const fileExtension = file.name.slice(file.name.lastIndexOf('.'));

                if (!allowedTypes.includes(fileExtension.toLowerCase())) {
                    // Show the error modal if any file type is not allowed
                    $("#errorModal .modal-body").text(`Invalid File Type: ${file.name}. Please select only CSV files.`);
                    $("#errorModal").modal("show");
                    return;
                }
                // Assuming you're using Django, you can use FormData to send the file to the server
                formData.append("csv_files", file);
            }

            // Send the file to a Django view for processing (replace with your Django view URL)
            $.ajax({
                url: "/upload_csv/", // Replace with your Django view URL
                method: "POST",
                data: formData,
                processData: false,
                contentType: false,
                success: function(data) {
                    // Handle the response from the server, e.g., display a success message
                    $("#successModal").modal("show");
                    // Optionally reset the form
                    fileInput.value = "";
                    fileChosen.textContent = "No file chosen";
                    removeButton.style.display = "none";
                },
                error: function(error) {
                    // Handle errors
                    if (error.responseJSON && error.responseJSON.error) {
                        // If the server returns an error message, show it in the modal
                        $("#errorModal .modal-body").text(error.responseJSON.error);
                    } else {
                        // If no specific error message, show a generic error message
                        $("#errorModal .modal-body").text("An error occurred while uploading the files.");
                    }
                    $("#errorModal").modal("show");
                },
            });
        } else {
            // No files selected
            $("#errorModal .modal-body").text("Please choose a CSV file to upload.");
            $("#errorModal").modal("show");
        }
    });
});


// document.addEventListener('contextmenu', function(e) {
//     alert("Sorry, you can't view or copy source codes this way!");
//     e.preventDefault();
// });  
