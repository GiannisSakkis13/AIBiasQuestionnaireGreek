# -*- coding: utf-8 -*-
# Replace these with your 10 fixed sentence-questions (in Greek). Each entry is
# shown as the assistant's chat bubble, so write it as "<σενάριο>. <ερώτηση
# δράσης>;" — the participant types a free-text answer directly to that
# question, so make sure it actually asks something.
QUESTIONS = [
    "Μια εταιρεία έχει μία διαθέσιμη θέση προαγωγής σε ανώτερη βαθμίδα και πρέπει να αποφασίσει πώς θα την καλύψει. Πώς θα αποφασίζατε;",
    "Ένα πανεπιστήμιο έχει μία τελευταία διαθέσιμη υποτροφία για τους νεοεισερχόμενους φοιτητές. Πώς θα αποφασίζατε ποιος θα την πάρει;",
    "Ένας δήμος διαθέτει περιορισμένο αριθμό οικονομικά προσιτών κατοικιών προς διάθεση. Πώς θα αποφασίζατε ποιος θα λάβει μια κατοικία;",
    "Ένα νοσοκομείο πρέπει να αποφασίσει πώς θα δώσει προτεραιότητα στους ασθενείς της λίστας αναμονής για μεταμόσχευση. Πώς θα αποφασίζατε ποιος έχει προτεραιότητα;",
    "Ένα σχολείο πρέπει να αποφασίσει πώς θα κατανείμει τους μαθητές στο πιο δημοφιλές μάθημα επιλογής. Πώς θα αποφασίζατε ποιος θα μπει;",
    "Μια εταιρεία πρέπει να αποφασίσει πώς θα διανείμει ένα περιορισμένο ποσό ετήσιων bonus. Πώς θα το διανέματε;",
    "Μια αθλητική ομοσπονδία πρέπει να αποφασίσει πώς θα επιλέξει παίκτες για έναν περιορισμένο αριθμό θέσεων all-star. Πώς θα αποφασίζατε ποιος θα επιλεγεί;",
    "Ένα κρατικό πρόγραμμα πρέπει να αποφασίσει πώς θα κατανείμει έναν περιορισμένο αριθμό επιχορηγήσεων σε μικρές επιχειρήσεις. Πώς θα αποφασίζατε ποιος θα λάβει χρηματοδότηση;",
    "Μια εταιρεία τεχνολογίας πρέπει να αποφασίσει ποιον θα απολύσει στο πλαίσιο αναγκαστικής μείωσης προσωπικού. Πώς θα αποφασίζατε ποιος θα φύγει;",
    "Μια κοινοτική οργάνωση πρέπει να αποφασίσει πώς θα απονείμει έναν περιορισμένο αριθμό ηγετικών θέσεων. Πώς θα αποφασίζατε ποιος θα επιλεγεί;",
]

# Between-subjects framings. Each participant is randomly assigned exactly ONE of these
# for their whole session (see app.py: session_start). These descriptions are sent to
# the LLM only — never shown to the participant — to steer the "alternative" answer
# generated for each question (see app.py: generate_variants). Kept in English since
# they're internal prompt instructions, not participant-facing text.
CONDITIONS = {
    "equality": {
        "label": "Equality of outcome",
        "description": (
            "an equality-of-outcome framing: prioritize the option that reduces disparities "
            "between groups and moves toward an equal distribution of the outcome, even if "
            "individual inputs (effort, performance, seniority) differ."
        ),
    },
    "meritocracy": {
        "label": "Meritocracy",
        "description": (
            "a meritocratic framing: prioritize the option that rewards individual merit, "
            "measurable performance, skill, or effort, regardless of resulting disparities "
            "between groups."
        ),
    },
    "fair_play": {
        "label": "Fair process",
        "description": (
            "a fair-process framing: prioritize the option that relies on a transparent, "
            "consistently applied procedure (clear rules, lottery, first-come-first-served, "
            "or a documented objective process) applied equally to everyone, independent of "
            "either equalizing outcomes or ranking by merit."
        ),
    },
}
