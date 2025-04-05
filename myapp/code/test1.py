user = {
    'past_company1': 'selected_user.past_company1',
    'past_company2': 'selected_user.past_company2',
    'past_company3': 'selected_user.past_company3',
    'past_company4': 'selected_user.past_company4',
    'past_company5': 'selected_user.past_company5',
    'educational_institute1': 'selected_user.educational_institute1',
    'educational_institute2': 'selected_user.educational_institute2',
    'educational_institute3': 'selected_user.educational_institute3'
}

# Capitalize each word in the keys
capitalized_user = {key.replace('_', ' ').title().replace(' ', '_'): value for key, value in user.items()}

print(capitalized_user)