#!/bin/bash

while true
do
  inotifywait -r -e modify,create,delete .

  git add .
  git commit -m "auto sync $(date +'%H:%M:%S')"
  git push origin main

  echo "🚀 Synced to GitHub!"
done
