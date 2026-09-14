# -*- coding: utf-8 -*-
# Demographic / general questions shown BEFORE the chat, as an ordinary form —
# not part of the AI chat flow. Add more entries here as needed; the frontend
# (static/app.js) renders this list dynamically, so no template changes are
# needed to add a question. Each entry:
#   id      — column name used when saving/exporting (keep it stable once data
#             collection starts, or old and new column names will both appear)
#   label   — the question text shown to the participant, in Greek
#   type    — currently only "select" (a dropdown) is supported
#   options — list of strings shown in the dropdown, in the order given
DEMOGRAPHIC_QUESTIONS = [
    {
        "id": "birth_year",
        "label": "Ποιο είναι το έτος γέννησής σας;",
        "type": "select",
        "options": [str(year) for year in range(1946, 2027)],
    },
    {
        "id": "education_level",
        "label": "Ποιος είναι ο ανώτερος τίτλος σπουδών που έχετε ολοκληρώσει;",
        "type": "select",
        "options": [
            "Πτυχίο (Bachelor)",
            "Μεταπτυχιακό (Master)",
            "Διδακτορικό (PhD)",
        ],
    },
]
