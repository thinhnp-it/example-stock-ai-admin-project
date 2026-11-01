from agent import build_workflow

app = build_workflow()


def generate_report(question):
    response = app.invoke({"question": question, "attempts": 0})
    return response
