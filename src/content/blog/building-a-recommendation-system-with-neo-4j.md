---
title: 'Building a recommendation system using Neo4j'
description: 'Modern applications now rely on recommendation systems to power personalized suggestions that improve user experiences. In this article, we’ll look at how to use Neo4j to create a simple recommendation system.'
pubDate: 'Jun 16 2023'
---

#### Recommendation system
Usually, it’s a system used to filter information and suggest items or content to the end user. The main objective is to offer tailored suggestions based on user preferences, interests, or past behaviors.

Recommendation systems are widely used in various business domains, such as social media, e-commerce, and entertainment. Recommendation systems play a crucial role in personalizing user experiences and enhancing customer satisfaction.

##### Social Networks
In social media, recommendation systems are crucial in enhancing user engagement and content discovery. The system collects information like hashtags, posts, and user relations, and is used to help users find more relevant posts, articles, videos, or new friends.

![Social network](/neo4j/social%20network.png)

We are all familiar with features like following or subscribing. On top of that, let’s look at how great of a job Youtube does at finding the best matching content we can spend hours on.

##### E-commerce
Systems for making recommendations are essential in e-commerce as they improve customer satisfaction and boost revenue. The system can define highly personalized products based on user preferences, purchase history, and browsing history, encouraging cross-selling, upselling, and ultimately increasing revenue and sales.

#### Understanding Neo4j and Graph Databases
Neo4j is a graph database management system designed to store, manage, and analyze highly connected data. It is based on the concept of a graph, where data is represented as nodes, which can be entities such as people or objects, and relationships that define connections between nodes. Neo4j provides a powerful and flexible platform for modeling, querying, and traversing complex relationships in data.

#### Cypher Query Language
Cypher is a query language similar to SQL that we can use for creating, browsing, and updating information in the graph database. Using clauses like in SQL we can perform the highly optimal operation on the database.

```cypher
// Create Node 
CREATE (node:label{key_1:value, key_2:value)
RETURN node

// Matching by nodes
MATCH (node:label) 
RETURN node 

// Matching by relationship
MATCH (node:label)<-[: Relationship]-(n) 
RETURN n 
```

#### Building Recommendation System using Neo4j
For this article, we will build a movie recommendation system, based on movies watched by followed users.

System storing information about Users and Movies
The system will allow the creation of a relationship between the User and the Movie. Also, users should be able to follow other users.
The goal is to display movies that have been watched by following users.
##### Build Our graph
We need to start by adding some data to our database. A few users and a few films ought to be made. Let’s begin with our first query.

```cypher
CREATE (john:User{firstName:"John"}), (tom:User{firstName:"Tom"}),
  (mark:User{firstName:"Mark"})

CREATE (titanic:Movie{title:"Titanic"}),(avatar:Movie{title:"Avatar"}),
  (forrest:Movie{title:"Forrest Gump"})
```

![Create first graph](/neo4j/create%20graph.png)

Now that our initial nodes have been successfully created, let’s examine the graph. We must now add a few node-to-node relations. Start with Tom’s favorite movies and the users that he follows.

```cypher
# Create User -> Movie relationship called Watched

MATCH 
(avatar:Movie{title: "Avatar"}),
(tom:User{firstName:"Tom"}) 
CREATE (tom)-[:Watched]->(avatar)

# Create user -> user relationship called Following

MATCH 
(tom:User{firstName:"Tom"}),
(mark:User{firstName: "Mark"}) 
CREATE (tom)-[:Following]->(mark)
```

A few operations later, our final graph will look like this.

![Final graph](/neo4j/final_graph.png)

Let’s make some queries
When our graph is filled with data, we can start exploring our data, on start let’s take an easy task to find all nodes with label users.

```
MATCH (users:User) 
return users
===================
RESULT
╒═══════════════════════════╕
│users                      │
╞═══════════════════════════╡
│(:User {firstName: "John"})│
├───────────────────────────┤
│(:User {firstName: "Tom"}) │
├───────────────────────────┤
│(:User {firstName: "Mark"})│
└───────────────────────────┘
```

Easy, right? So now, let’s try to find all movies, that John watched.

```
MATCH (user:User{firstName:"John"})--(movies:Movie) 
return movies
=========================
RESULT
╒════════════════════════════════╕
│movies                          │
╞════════════════════════════════╡
│(:Movie {title: "Avatar"})      │
├────────────────────────────────┤
│(:Movie {title: "Forrest Gump"})│
└────────────────────────────────┘
```
Okay, this one was already a little more difficult, because we had to introduce the relation, but have hope that you got the concept and we can move forward.

Next, let’s try to find all users followed by Tom knowing that Tom's node is equal to 6.

```
MATCH (user:User)-[:Following]->(following) 
WHERE ID(user) = 6 
return following
==========================
╒═══════════════════════════╕
│following                  │
╞═══════════════════════════╡
│(:User {firstName: "John"})│
├───────────────────────────┤
│(:User {firstName: "Mark"})│
└───────────────────────────┘
```

As you can see, using Cypher is very similar to SQL in the case of using clauses. Our final task for today is to build a query for our recommendation system, we want to find all movies watched by users followed by Tom.

```
MATCH (tom:User{firstName: "Tom"})-[:Following]->(users)-[:Watched]->(movies) 
return movies
==============================
RESULT
╒════════════════════════════════╕
│movies                          │
╞════════════════════════════════╡
│(:Movie {title: "Titanic"})     │
├────────────────────────────────┤
│(:Movie {title: "Avatar"})      │
├────────────────────────────────┤
│(:Movie {title: "Forrest Gump"})│
└────────────────────────────────┘
```
Almost there. One more thing to do, we need to exclude movies already watched by Tom. For that, we’ll use **WHERE NOT** clause.

```
MATCH 
(tom:User{firstName: "Tom"}), 
(tom)-[:Following]->(users)-[:Watched]->(otherMovies) 
WHERE NOT (tom)-[:Watched]->(otherMovies) 
return otherMovies
=================================
RESULT
╒════════════════════════════════╕
│otherMovies                     │
╞════════════════════════════════╡
│(:Movie {title: "Titanic"})     │
├────────────────────────────────┤
│(:Movie {title: "Forrest Gump"})│
└────────────────────────────────┘
```

#### Next steps
Our first recommendation system is ready, now we can extend it more, and play with much more options that Neo4j provides us. Check out their official documentation https://neo4j.com/docs/ to see more.

Neo4j provides multiple drivers for the most popular programming languages like Python or Java — https://neo4j.com/developer/language-guides/.

