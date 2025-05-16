// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract CookieClicker {
    // Mapping to store the number of clicks for each user
    mapping(address => uint256) public userClicks;

    // Total clicks across all users
    uint256 public totalClicks;

    // Event emitted when a user clicks
    event Click(address indexed user, uint256 newClickCount);

    // Function to increment a user's click count
    function click() public {
        userClicks[msg.sender]++;
        totalClicks++;

        emit Click(msg.sender, userClicks[msg.sender]);
    }

    // Function to get a user's click count
    function getClicks() public view returns (uint256) {
        return userClicks[msg.sender];
    }

    // Function to get a specific user's click count
    function getClicksForUser(address user) public view returns (uint256) {
        return userClicks[user];
    }
}
