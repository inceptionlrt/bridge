#!/bin/bash

# Define output colors
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

# Define two parallel arrays
assets=("inETH" "inETH" "inETH" "instETH")
networks=("arbitrum" "linea" "mode" "arbitrum")

# Loop over each asset and its associated network in the deployment array
# Loop through indices
for i in "${!assets[@]}"; do
    asset=${assets[$i]}
    network=${networks[$i]}

    echo_green "Deployment started for asset: "
    echo_yellow "$asset"
    echo_green " on network: "
    echo_yellow "$network"
    echo_reset_newline

    # Run the deployment command and log output to both the console and file
    npx hardhat deploy-rate-provider --asset "$asset" --network "$network" 2>&1

    # Check the status of the deployment
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo_green "Deployment to $network successful at $(date)"
        echo_reset_newline
    else
        echo_red "Deployment to $network failed at $(date)"
    fi

    # Sleep for 5 seconds before the next deployment
    echo "Sleeping for 5 seconds..."
    sleep 5
done

echo_green "All deployments completed."
