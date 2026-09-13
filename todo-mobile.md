

=================
=================
=================
=================
=================
=================
=================

on  SU on this page http://localhost:4000/gstore/6a221d390513e7089e31b5b3 
when i add items to the cart and also add the notes for it and a replacement options for that item 
i want that information to be saved in the order "as replacement" for X item. 
& all that data shoudl then show up at under /admin/orders page. 

and 
Build the replacement option on ic and ac


=================

Before some body palce order on teh checkotu page, it shoudl always have to first pick the schedule day or tiem , or else show the error message on this page. 



=================
on SU

on the checkout page if the user have no selected the delivery optoin ie scheduele delivery date or tiem, when he tries to place the order without having picked the delviery date and tiem for this specific order : 

we do following : 

Direct Action: Trigger your existing Schedule Delivery Modal immediately.

In-Modal Header: Inside that opened modal, display a top notification bar or explicit instruction stating: "Please select a delivery date & time to continue with your order.


=================


Currently on SU when we create an order lets suppose on a grocery store on this linke http://localhost:4000/gstore/6a221d390513e7089e31b5b3

we click some items and add to cart.  and then the user goes to the checkotu page 
during this process it creates teh order in teh DB collections = Orders, 

But now I want you to also add following thigns along with the existin gitems 
1) each item object  has data like following:
items
Array (2)

0
Object (6)
pricePaid
2.99
quantity
1
aisle
""
productId
"blueberries-package"
sku
""
nameSnapshot
"Blueberries, Package"

But i also watn you to add the item images , 
Each Item Notes that user may have provided on the replacement modal.  so that also needs to be added in this section. 

and at the end all this information needs to show up on http://localhost:4000/admin/orders page under its order row section. 

B) Also send the day and time for which the delivery has been scheduled for. 
or what type of delivery order this is

========
======== IMP ========

In the login form, in the phone number input box, if user somehow inputs more than the phone number number of digits or some other issue, we need to provide them with informative message or validation message, which we are not doing it right now. Kindly fix it.
======== 


