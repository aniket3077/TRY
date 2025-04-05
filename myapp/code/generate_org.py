import pandas as pd 
from pathlib import Path
import numpy as np
import os, json,csv, re
from django.conf import settings

def generate_org(input_file, input_org, filename, selected_user):
    df  = pd.read_csv(input_file)
    df.fillna('', inplace=True)
    column_mapping = {
     'Supervisor':'Reporting_To',
     'Category Type' : 'Node_Type',
     'Department': 'Department_Name',
     'Organization Name': 'Company_Name',
     'Domain' : 'Website',
     'Employee Range': 'Employee_Range',
     'Industry': 'Industry',
     'Solution Offered': 'Business_Solution',
     'Primary Address':'Address_1',
     'Postal Code':'Zip_Code',
     'First Name': 'First_Name',
     'Last Name': 'Last_Name',
     'Email Address': 'Email_Id',
     'Designation': 'Job_Title',
     'Seniority Level': 'Seniority_Level',
     'Job Function': 'Job_Function',
     'LinkedIn Profile': 'LinkedIn_URL',
     'Public Profile':'Public_Profile',
     'Boardline Number':'Contact_Number1',
     'Personal Number': 'Contact_Number2',
     'City/Town': 'City',
     'State/Province' : 'State',
     'Country/Region' : 'Country',
     'Notes' : 'Notes',
     'Mutual Point' : 'Konnect_Point',
     'Education 1'	: 'Educational_Institute1',		
     'Education 2'	: 'Educational_Institute2',
     'Education 3'	: 'Educational_Institute3',
     'Previous Company 1' : 'Past_Company1',
     'Previous Company 2' : 'Past_Company2',
     'Previous Company 3' : 'Past_Company3',
     'Previous Company 4' :	'Past_Company4',
     'Previous Company 5' : 'Past_Company5',
     'Insight Title1'	: 'Insight_Heading1',			 
     'Insight Description' : 	'Insight_Content1',
     'Insight Source1' : 'Insight_Link1',
     'Insight Date1': 'Insight_Date1',
     'Insight Title2' : 'Insight_Heading2',			 	
     'Insight Description2' : 'Insight_Content2',	
     'Insight Source2' : 'Insight_Link2',
     'Insight Date2' : 'Insight_Date2',
    'Insight Title3' : 'Insight_Heading3',			 	
    'Insight Description3' : 'Insight_Content3',	
    'Insight Source3'	: 'Insight_Link3',
    'Insight Date3' : 'Insight_Date3',
    'Insight Title4'	: 'Insight_Heading4',				
    'Insight Description4' : 	'Insight_Content4',
    'Insight Source4'	: 'Insight_Link4',
    'Insight Date4' : 	'Insight_Date4',
    'Img_url' : 'Img_url',
    'Facebook' : 'Facebook',

}

    df2 = df
    def fill_department(supervisor):
        if pd.isna(supervisor):
            return np.nan  
        
        if '@' in supervisor:
            
            person_row = df2[df2['Email Address'] == supervisor]
            if not person_row.empty:
                
                next_supervisor = person_row['Supervisor'].iloc[0]
                return fill_department(next_supervisor)
        else:
            
            return supervisor


    df2.loc[df2['Category Type'] == 'Person', 'Department'] = df2[df2['Category Type'] == 'Person']['Supervisor'].apply(fill_department)

    output_file = os.path.join(settings.MEDIA_ROOT, "output_csv", f"{filename}.csv")
    columns_to_write = ['Organization Name', 'Domain', 'Employee Range', 'Department', 'Industry', 'Solution Offered', 'Primary Address', 'City/Town', 'State/Province', 'Country/Region', 'Postal Code', 'Seniority Level', 'Job Function', 'Full Name', 'Designation', 'LinkedIn Profile', 'Public Profile', 'Email Address', 'Boardline Number', 'Personal Number']
    df2['Full Name'] = df2['First Name'] + ' ' + df2['Last Name']
    df2.loc[df2['Category Type'] == 'Person'][columns_to_write].to_csv(output_file, index=False)



    df.rename(columns=column_mapping, inplace=True)
    # last_column = df.iloc[:, -1]
    column_names = np.array(df.columns)


    array_columns = {}
    for column in column_names:
        array_columns[column] = df[column].to_numpy()

    #replacing .0 to '' all numeric values
    try:
        array_columns['Zip_Code']  = np.array([str(x).replace('.0', '') for x in array_columns['Zip_Code']])
        array_columns['Employee_Range']  = np.array([str(x).replace('.0', '') for x in array_columns['Employee_Range']])
        array_columns['Contact_Number1']  = np.array([str(x).replace('.0', '') for x in array_columns['Contact_Number1']])
        array_columns['Contact_Number2']  = np.array([str(x).replace('.0', '') for x in array_columns['Contact_Number2']])

    except:
        pass

    # personcount  and department count in sheet
    personCount = 0 
    departmentNames = array_columns['Department_Name'].tolist()
    departmentNames = json.dumps(departmentNames)

    for i in array_columns['Node_Type']:
        if i == 'Person' or i == 'person':
            personCount+=1
        else:
            pass
            
    #for matchpoint filter 
    selected_values = {}
    # Initialize empty arrays in selected_values
    for i in range(len(array_columns['Node_Type'])):
        selected_values[i] = []

    keys = ['Past_Company1', 'Past_Company2', 'Past_Company3', 'Past_Company4', 'Past_Company5', 'Educational_Institute1', 'Educational_Institute2', 'Educational_Institute3']
    for key, arr in array_columns.items():
        if key in keys:
            for i, value in enumerate(arr):
                if array_columns['Node_Type'][i] == 'Person':
                    selected_values[i].append(value)
        else:
            continue
            
    user = {
        'Past_Company1': selected_user.past_company1,
        'Past_Company2': selected_user.past_company2,
        'Past_Company3': selected_user.past_company3,
        'Past_Company4': selected_user.past_company4,
        'Past_Company5': selected_user.past_company5,
        'Educational_Institute1': selected_user.educational_institute1,
        'Educational_Institute2': selected_user.educational_institute2,
        'Educational_Institute3': selected_user.educational_institute3
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
    matchpoint = []
    for index, result in results.items():
        if len(result) >1:
            true_count = result.count(True)
            if true_count > 1:
                if true_count >= 3:
                    matchpoint.append('Priority 1')
                elif true_count == 2:
                    matchpoint.append('Priority 2')
            elif true_count == 1:
                matchpoint.append('Priority 3')
            else:
                matchpoint.append('No Match')
            print(f"Index: {index} True count: {true_count}")
            print(f"Index: {index}{result}")
        else:
            matchpoint.append('') #for department nodes

    matchpoint = np.array(matchpoint)
    # for index, result in selected_values.items():
    #     print(index,result)

    #matchpoint filter end


    # Create a list to store indices for each element
    indices_list = []
    # Iterate through all the elements and get the indices
    for index, value in np.ndenumerate(array_columns['Node_Type']):
        indices_list.append(index)

    # Convert the list of tuples to a numpy array and increse the values by 1
    # here we get id_array
    node_id =np.array([index[0] for index in indices_list])+1 

   

    def generate_svg_file(initials, directory):
        svg_content = f'<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="60" fill="#4DBEE5"/><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="60" fill="white">{initials}</text></svg>'
        svg_filename = f"{initials}.svg"
        filepath = os.path.join(directory,"img","placeholders"  ,svg_filename)
        with open(filepath, 'w') as f:
            f.write(svg_content)
        return svg_filename


    if 'Img_url' not in array_columns:
        array_columns['Img_url'] = np.full(node_id.size, '')

    company_logo = ''
    org_website = ''
    org_employee_range = ''
    org_industry = ''
    org_business_solution = ''
    org_address_1 = ''
    org_zip_code = ''
    org_city = ''
    org_state = ''
    org_country = ''
    org_email_id = ''
    org_linkedin_url = ''
    org_facebook = ''
    org_x = ''
    org_other = '' 
    org_public_profile = ''
    org_contact_number1 = ''
    org_contact_number2 = ''
    org_notes = ''
    org_insight_heading1 = ''
    org_insight_content1 = ''
    org_insight_link1 = ''
    org_insight_date1 = ''
    org_insight_heading2 = ''
    org_insight_content2 = ''
    org_insight_link2 = ''
    org_insight_date2 = ''
    org_insight_heading3 = ''
    org_insight_content3 = ''
    org_insight_link3 = ''
    org_insight_date3 = ''
    org_insight_heading4 = ''
    org_insight_content4 = ''
    org_insight_link4 = ''
    org_insight_date4 = ''

    temp_urls = []
    for i, url in enumerate(array_columns['Img_url']):
       
        if not array_columns['Img_url'][i]:
            node_type = array_columns['Node_Type'][i]
            if node_type == 'Department':
                if company_logo:
              
                    temp_urls.append(company_logo)
                else:
                    for j in range(len(array_columns['Img_url'])):
                        if array_columns['Node_Type'][j] == 'Department' and array_columns['Img_url'][j]:
                            company_logo = array_columns['Img_url'][j]
                            org_website = array_columns['Website'][j]
                            org_employee_range = array_columns['Employee_Range'][j]
                            org_industry = array_columns['Industry'][j]
                            org_business_solution = array_columns['Business_Solution'][j]
                            org_address_1 = array_columns['Address_1'][j]
                            org_zip_code = array_columns['Zip_Code'][j]
                            org_city = array_columns['City'][j]
                            org_state = array_columns['State'][j]
                            org_country = array_columns['Country'][j]
                            org_email_id = array_columns['Email_Id'][j]
                            org_linkedin_url = array_columns['LinkedIn_URL'][j]
                            org_facebook = array_columns['Facebook'][j]
                            org_x = array_columns['X'][j]
                            org_other = array_columns['Other'][j] 
                            org_public_profile = array_columns['Public_Profile'][j]
                            org_contact_number1 = array_columns['Contact_Number1'][j]
                            org_contact_number2 = array_columns['Contact_Number2'][j]
                            org_notes = array_columns['Notes'][j]
                            org_insight_heading1 = array_columns['Insight_Heading1'][j]
                            org_insight_content1 = array_columns['Insight_Content1'][j]
                            org_insight_link1 = array_columns['Insight_Link1'][j]
                            org_insight_date1 = array_columns['Insight_Date1'][j]
                            org_insight_heading2 = array_columns['Insight_Heading2'][j]
                            org_insight_content2 = array_columns['Insight_Content2'][j]
                            org_insight_link2 = array_columns['Insight_Link2'][j]
                            org_insight_date2 = array_columns['Insight_Date2'][j]
                            org_insight_heading3 = array_columns['Insight_Heading3'][j]
                            org_insight_content3 = array_columns['Insight_Content3'][j]
                            org_insight_link3 = array_columns['Insight_Link3'][j]
                            org_insight_date3 = array_columns['Insight_Date3'][j]
                            org_insight_heading4 = array_columns['Insight_Heading4'][j]
                            org_insight_content4 = array_columns['Insight_Content4'][j]
                            org_insight_link4 = array_columns['Insight_Link4'][j]
                            org_insight_date4 = array_columns['Insight_Date4'][j]
                            temp_urls.append(company_logo)
                            break
                    else:
                        temp_urls.append(company_logo)
            elif node_type == 'Person':
                svg_first_name = array_columns['First_Name'][i]
                svg_last_name = array_columns['Last_Name'][i]
                first_name_initial = svg_first_name.split()[0][0].upper() if svg_first_name else ''
                last_name_initial = svg_last_name.split()[-1][0].upper() if svg_last_name else ''
                initials = f"{first_name_initial}{last_name_initial}" if first_name_initial and last_name_initial else ''
                svg_filename = f"{initials}.svg"
                filepath = os.path.join(settings.MEDIA_ROOT, "img","placeholders", svg_filename)
                if not os.path.exists(filepath):
                    svg_filename = generate_svg_file(initials, settings.MEDIA_ROOT)
                fileURI = settings.BASE_URL + settings.STATIC_URL + "placeholders/" +  svg_filename
                temp_urls.append(fileURI)
        else:
            # If 'Img_url' already has a value, keep it unchanged
            temp_urls.append(array_columns['Img_url'][i])
    array_columns['Img_url'] = temp_urls


    # for matchpoint filter 
    




    # list to store indices for each value in Reporting_to
    pid_list = []

    # Loop through each value in Reporting_to and find indices in Department_Name and Email_id (Skipping the first element)
    for idx, value in enumerate(array_columns['Reporting_To']):
        
        dept_indices = np.where(array_columns['Department_Name'] == value)[0]+1
        email_indices = np.where(array_columns['Email_Id'] == value)[0]+1
        
        if value==array_columns['Reporting_To'][0]:
            pid_list.append(0)
        if (dept_indices.size) == 1 and dept_indices[0] == 0:
                pid_list.append(dept_indices[0])
        elif any(dept_indices): 
            closest_dept_index = dept_indices[np.argmin(np.abs(dept_indices-idx))]
            pid_list.append(closest_dept_index)
            
        if any(email_indices):
            closest_email_index = email_indices[np.argmin(np.abs(email_indices-idx))]
            pid_list.append(closest_email_index)
            



    # converting the list to array also increasing each value by 1 because we have node_ids starting from 1
    #here we get pid_array
    node_pid = np.array(pid_list)



    # Concatenate the first name and last name to get full name 
    # here we get node_name array
    person_node_name = np.array([f"{first_name} {last_name}" for first_name, last_name in zip(array_columns['First_Name'], array_columns['Last_Name'])])




    arrays_dict = {
        'id': node_id,
        'pid': node_pid,
        'Department_Name': array_columns['Department_Name'],
        'Person_Name': person_node_name,
        'Node_Type': array_columns['Node_Type'],
        'Title': array_columns['Job_Title']
    }





    # opening a html template 
    with open(input_org, "r") as template_file:
        template_content = template_file.read()

    # # Generate the content as a string
    content = f"""chart.add({{id:0,tags: ['Department'], 'Category Type': 'Organization' ,img:'{company_logo}' ,org_name: \"{array_columns['Reporting_To'][0]}\",
        'Domain' :  \"{org_website}\",
        'Employee Range' : \"{org_employee_range}\",
        'Industry' : \"{org_industry}\",
        'Solution Offered' : \"{org_business_solution}\",
        'Primary Address' : \"{org_address_1}\",
        'Postal Code' : \"{org_zip_code}\",
        'City/Town' : \"{org_city}\",
        'State/Province' : \"{org_state}\",
        'Country/Region' : \"{org_country}\",
        'Email Address' : \"{org_email_id}\",


        'LinkedIn Profile' : \"{org_linkedin_url}\",
        'Facebook' : \"{org_facebook}\",
        'X': \"{org_x}\",
        'Other': \"{org_other}\",
        'Public Profile' : \"{org_public_profile}\",
        'Boardline Number' : \"{org_contact_number1}\",
       
        'Notes' : \"{org_notes}\",
        'Insight Title1' : \"{org_insight_heading1}\",
        'Insight Description' : \"{org_insight_content1}\",
        'Insight Source1' : \"{org_insight_link1}\",
        'Insight Date1' : \"{org_insight_date1}\",

        'Insight Title2' : \"{org_insight_heading2}\",
        'Insight Description2' : \"{org_insight_content2}\",
        'Insight Source2' : \"{org_insight_link2}\",
        'Insight Date2' : \"{org_insight_date2}\",

        'Insight Title3' : \"{org_insight_heading3}\",
        'Insight Description3' : \"{org_insight_content3}\",
        'Insight Source3' : \"{org_insight_link3}\",
        'Insight Date3' : \"{org_insight_date3}\",

        'Insight Title4' : \"{org_insight_heading4}\",
        'Insight Description4' : \"{org_insight_content4}\",
        'Insight Source4' : \"{org_insight_link4}\",
        'Insight Date4' : \"{org_insight_date4}\",


           }});\n"""



    node_type_array = arrays_dict['Node_Type']
    for item in zip(arrays_dict['id'], 
                    arrays_dict['pid'], 
                    arrays_dict['Person_Name'],
                    arrays_dict['Department_Name'],
                    arrays_dict['Title'],
                    arrays_dict['Node_Type'],
                    array_columns['Company_Name'],
                    array_columns['Website'],
                    array_columns['Employee_Range'],
                    array_columns['Industry'],
                    array_columns['Business_Solution'],
                    array_columns['Address_1'],
                    array_columns['Zip_Code'],
                    array_columns['City'],
                    array_columns['State'],
                    array_columns['Country'],
                    array_columns['Email_Id'],
                    array_columns['Seniority_Level'],
                    array_columns['Job_Function'],
                    array_columns['LinkedIn_URL'],
                    array_columns['Public_Profile'],
                    array_columns['Contact_Number1'],
                    array_columns['Contact_Number2'],
                    array_columns['Notes'],
                    array_columns['Educational_Institute1'],
                    array_columns['Educational_Institute2'],
                    array_columns['Educational_Institute3'],
                    array_columns['Past_Company1'],
                    array_columns['Past_Company2'],
                    array_columns['Past_Company3'],
                    array_columns['Past_Company4'],
                    array_columns['Past_Company5'],
                    array_columns['Insight_Heading1'],
                    array_columns['Insight_Content1'],
                    array_columns['Insight_Link1'],
                    array_columns['Insight_Date1'],
                    array_columns['Insight_Heading2'],
                    array_columns['Insight_Content2'],
                    array_columns['Insight_Link2'],
                    array_columns['Insight_Date2'],
                    array_columns['Insight_Heading3'],
                    array_columns['Insight_Content3'],
                    array_columns['Insight_Link3'],
                    array_columns['Insight_Date3'],
                    array_columns['Insight_Heading4'],
                    array_columns['Insight_Content4'],
                    array_columns['Insight_Link4'],
                    array_columns['Insight_Date4'],
                    array_columns['Img_url'],
                    array_columns['Facebook'],
                    array_columns['X'],
                    array_columns['Other'],
                    matchpoint
                    ):
        (id_value, pid_value, person_name, department_name, title, node_type, company_Name, website, employee_range, industry,
        business_solution,
        address_1,
        zip_code,
        city,
        state,
        country,
        email_id,
        seniority_level,
        job_function,
        linkedin_url,
        public_profile,
        contact_number1,
        contact_number2,
        notes,
        educational_institute1,
        educational_institute2,
        educational_institute3,
        past_company1,
        past_company2,
        past_company3,
        past_company4,
        past_company5,
        insight_heading1,
        insight_content1,
        insight_link1,
        insight_date1,
        insight_heading2,
        insight_content2,
        insight_link2,
        insight_date2,
        insight_heading3,
        insight_content3,
        insight_link3,
        insight_date3,
        insight_heading4,
        insight_content4,
        insight_link4,
        insight_date4,img_url,
        facebook, x, other,matchpoint ) = item
        
        if node_type == 'Department':
            line = f"""chart.add({{id: {id_value}, 
                    tags: ['Department'], 
                    pid: {pid_value}, 
                    'Category Type': 'Department' ,
                    matchpoint: \"{matchpoint}\",
                    img: \"{img_url}\", 
                    'Department': \"{department_name}\",
                    'Organization Name': \"{company_Name}\",
                    'Domain': \"{website}\",
                    'Employee Range': \"{employee_range}\",
                    'Industry': \"{industry}\",
                    'Solution Offered': \"{business_solution}\",
                    'Primary Address': \"{address_1}\",
                    'Postal Code': \"{zip_code}\",
                    'City/Town': \"{city}\",
                    'State/Province': \"{state}\",
                    'Country/Region': \"{country}\",
                    'Email Address': \"{email_id}\",
                    'LinkedIn Profile': \"{linkedin_url}\",
                    'Facebook' : \"{facebook}\",
                    'X': \"{x}\",
                    'Other': \"{other}\",
                    'Boardline Number': \"{contact_number1}\",
                    'Notes': \"{notes}\",
                    
                    'Insight Title1': \"{insight_heading1}\",
                    'Insight Description': \"{insight_content1}\",
                    'Insight Source1': \"{insight_link1}\",
                    'Insight Date1': \"{insight_date1}\",
                    'Insight Title2': \"{insight_heading2}\",
                    'Insight Description2': \"{insight_content2}\",
                    'Insight Source2': \"{insight_link2}\",
                    'Insight Date2': \"{insight_date2}\",
                    'Insight Title3': \"{insight_heading3}\",
                    'Insight Description3': \"{insight_content3}\",
                    'Insight Source3': \"{insight_link3}\",
                    'Insight Date3': \"{insight_date3}\",
                    'Insight Title4': \"{insight_heading4}\",
                    'Insight Description4': \"{insight_content4}\",
                    'Insight Source4': \"{insight_link4}\",
                    'Insight Date4': \"{insight_date4}\",

                    }});"""

        elif node_type=='Person':
            line = f"""chart.add({{id: {id_value}, pid: {pid_value},'Category Type': 'Person', name: \"{person_name}\", 'Designation': \"{title}\",
                    img: \"{img_url}\",
                    matchpoint: \"{matchpoint}\",
                    'Organization Name': \"{company_Name}\",
                    'Domain': \"{website}\",
                    'Employee Range': \"{employee_range}\",
                    'Industry': \"{industry}\",
                    'Solution Offered': \"{business_solution}\",
                    'Primary Address': \"{address_1}\",
                    'Postal Code': \"{zip_code}\",
                    'City/Town': \"{city}\",
                    'State/Province': \"{state}\",
                    'Country/Region': \"{country}\",
                    'Email Address': \"{email_id}\",
                    'Seniority Level': \"{seniority_level}\",
                    'Job Function': \"{job_function}\",
                    'LinkedIn Profile': \"{linkedin_url}\",
                    'Facebook' : \"{facebook}\",
                    'X': \"{x}\",
                    'Other': \"{other}\",
                    'Public Profile': \"{public_profile}\",
                    'Boardline Number': \"{contact_number1}\",
                    'Personal Number': \"{contact_number2}\",
                    'Notes': \"{notes}\",
                    'Education 1': \"{educational_institute1}\",
                    'Education 2': \"{educational_institute2}\",
                    'Education 3': \"{educational_institute3}\",
                    'Previous Company 1': \"{past_company1}\",
                    'Previous Company 2': \"{past_company2}\",
                    'Previous Company 3': \"{past_company3}\",
                    'Previous Company 4': \"{past_company4}\",
                    'Previous Company 5': \"{past_company5}\",
                   'Insight Title1': \"{insight_heading1}\",
                    'Insight Description': \"{insight_content1}\",
                    'Insight Source1': \"{insight_link1}\",
                    'Insight Date1': \"{insight_date1}\",
                    'Insight Title2': \"{insight_heading2}\",
                    'Insight Description2': \"{insight_content2}\",
                    'Insight Source2': \"{insight_link2}\",
                    'Insight Date2': \"{insight_date2}\",
                    'Insight Title3': \"{insight_heading3}\",
                    'Insight Description3': \"{insight_content3}\",
                    'Insight Source3': \"{insight_link3}\",
                    'Insight Date3': \"{insight_date3}\",
                    'Insight Title4': \"{insight_heading4}\",
                    'Insight Description4': \"{insight_content4}\",
                    'Insight Source4': \"{insight_link4}\",
                    'Insight Date4': \"{insight_date4}\",

                    
                    }});"""
        else:
            continue
        content += line + "\n"

    #code for filename while saving
    # filename = f"{array_columns['Reporting_To'][0]}"

    index = content.find('chart.add({id: 150,')
    # If the string is found, extract the substring before it (node limit to 150)
    if index != -1:
        content = content[:index]
    # content = re.sub(r'\s{2,}', ' ', content)
    # Replace the placeholder in the template with the generated content
    final_content = template_content.replace("{{CONTENT}}", content)
    final_content = final_content.replace("{{FILENAME}}", filename)
    final_content = final_content.replace("{{COMPANY_LOGO}}", company_logo)
    save_path = os.path.join(settings.BASE_DIR,'myapp','templates','orgcharts')
    if not os.path.exists(save_path):
        os.makedirs(save_path)
    

    # # # Write the modified content to the output HTML file
    with open(os.path.join(save_path,f"{filename}.html"), "w", encoding='utf-8') as output_file:
        output_file.write(final_content)
        output_file.close()
    return True, personCount, departmentNames






    




