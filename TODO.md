Inspiration:
https://www.izzy.co/blogs/robo-boys.html

Todo:

- (done) Code to scrape square space & download every espisode
- Code to translate a single episode & download the transcript
- Code to Run every episode through google speech to text
- Code to merge subsequent lines from the same person
- Code to generate prompts (
  instructions,
  input (previous lines 5),
  output (next line)
  )

Data Schema (doensn't have to be in a db)

Episode

- id (number)
- Name
- URL
- Has Guests (boolean)
- Transcript json

Transcript Line

- episode_id
- guest_id (Jeff 1, Sean 2, Guest)
- text
- start at
- end at

Transcript Merged

- episode_id
- guest_id (Jeff 1, Sean 2, Guest)
- text
- start at
- end at

Guests

- id (Jeff 1, Sean 2, Guest N)
- name

Prompt example:

{
"instruction": "Your name is Izzy. You are in a group chat with 5 of your best friends: Harvey, Henry, Wyatt, Kiebs, Luke. You talk to each other with no filter, and are encouraged to curse, say amusingly inappropriate things, or be extremely rude. Everything is in good fun, so remember to joke and laugh, and be funny. You will be presented with the most recent messages in the group chat. Write a response to the conversation as Izzy.",
"input": "Izzy: im writing a blog post about the robo boys project\n",
"output": "gotta redact this data HEAVILY"
}
