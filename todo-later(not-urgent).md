
======



======
While creating a pro account : 

Minor Technical Verification Checks
Default Value for Existing/New Users:

In MongoDB: New users created outside admin controls will have an omitted accountStatus field until updated. Your frontend fallback (u.accountStatus || 'account_under_review') handles this cleanly.

In User.go: If you want new user registrations in Go to automatically start as "account_under_review" directly in the database, make sure your user creation logic (e.g., CreateUser or auth signup flow) sets AccountStatus: "account_under_review".



======
make hte http://localhost:4000/settings page UI like 

https://www.doordash.com/consumer/edit_profile

======== 


