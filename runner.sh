# will NOT restart when the exit code is 0

until npm run main; do
    echo "Bot process has died ... will restart it now."
    sleep 10
done
