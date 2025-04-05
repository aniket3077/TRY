import numpy as np

array_columns = {
    'past_company1': np.array(['A', 'B', 'C', '', 'A', '', '', '', '', '']),
    'past_company2': np.array(['D', 'E', 'G', '', '', '', '', '', '', '']),
    'past_company3': np.array(['F', '', '', '', 'F', '', '', '', '', '']),
    'past_company4': np.array(['F', '', '', '', '', '', '', '', '', '']),
    'past_company5': np.array(['', 'J', '', '', '', '', '', '', '', '']),
    'educational_institute1': np.array(['', 'Y', 'Z', '', '', '', '', '', '', '']),
    'educational_institute2': np.array(['P', 'Q', '', '', '', '', '', '', '', '']),
    'educational_institute3': np.array(['R', '', '', '', 'X', '', '', '', '', '']),
    'node_type' : np.array(['Department', 'Person', 'Person', 'Person', 'Department', 'Person', 'Person', 'Department', 'Department', 'Person']),

}

selected_values = {}
length = len(array_columns['educational_institute3'])

# Initialize empty arrays in selected_values
for i in range(length):
    selected_values[i] = []



keys = ['past_company1', 'past_company2', 'past_company3', 'past_company4', 'past_company5',
        'educational_institute1', 'educational_institute2', 'educational_institute3']
for key, arr in array_columns.items():
    if key in keys:
        for i, value in enumerate(arr):
            if array_columns['node_type'][i] == 'Person':
                selected_values[i].append(value)
        

user = {
    'past_company1': 'A',
    'past_company2': 'B',
    'past_company3': 'E',
    'past_company4': 'G',
    'past_company5': '',
    'educational_institute1': 'Z',
    'educational_institute2': None,
    'educational_institute3': None
}

results = {}

# Iterate over each item in selected_values
for index, arr in selected_values.items():
    results[index] = []
    if len(arr) > 1:
    # Check if the value associated with each user attribute is present in the array at the specific index
        for key, value in user.items():
            results[index].append(value in arr if arr and value != '' else False)

# Print the results
for index, result in results.items():
    if len(result) >1 :
        true_count = result.count(True)
        print(f"Index: {index} True count: {true_count}")
    # print(f"Index: {index} {result}")
    

for index, result in selected_values.items():
    print(index,result)
