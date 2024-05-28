#!/bin/bash

# KEEP IT UP-TO-DATE
networks=("localhost" "localhost")

echo_green() {
    echo -ne "\033[32m$1\033[0m"
}
echo_yellow() {
    echo -e "\033[33m$1\033[0m"
}
echo_red() {
    echo -e "\033[31m$1\033[0m"
}
echo_reset_newline() {
    echo -e "\033[0m"
}

# Check if networks array is empty
if [ ${#networks[@]} -eq 0 ]; then
    echo_red "No networks specified in the configuration file."
    exit 1
fi


# Loop over each network
for network in "${networks[@]}"
do
    echo_green "Deployment started for "
    echo_yellow "$network"

    # Run the deployment command and log output to both the console and file
    npx hardhat run deploy-rate-providers -- --network $network 2>&1

    # Check the status of the deployment
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo_green "Deployment to $network successful at $(date)"
        echo_reset_newline
    else
        echo_red "Deployment to $network failed at $(date)"
    fi

    # Sleep for (5 seconds) before the next deployment
    echo "Sleeping for 5 seconds..."
    echo ""
    sleep 5
done

echo_green "All deployments completed."
