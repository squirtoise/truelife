import 'dotenv/config';

import app from '../../server/index';
import request from 'supertest';

// NODE_ENV set to test, uses test dB

/* 
  Test DB visual (after tests):

  users:
  userId: 1
  userId: 2

  user_friends:
  userId: 1, friendId: 2, request: false
  userId: 2, friendId: 1, request: false
  (request = true on initial post, then request is accepted by user 2)

  posts:
  postId: 1, creator: 1
  postId: 2, creator: 2

  comments:
  commentId: 1, postId: 1, creator: 1
  commentId: 1, postId: 2, creator: 1
*/

describe('REST route tests', () => {
    describe('User Router [/api/user routes]', () => {
        describe('User CRUD Success', () => {
            // should create a new user successfully
            test('POST /api/user', async () => {
                let user = {
                    email: '1',
                    password: '1',
                    first: '1',
                    last: '1',
                    window: '01:00',
                };

                const user1 = await request(app)
                    .post('/api/user')
                    .send(user)
                    .set('Accept', 'application/json');

                expect(user1.headers['content-type']).toMatch(/json/);
                expect(user1.status).toEqual(200);

                expect(user1.body.id).toEqual(1);
                expect(user1.body.email).toEqual(user.email);
                expect(user1.body.first_name).toEqual(user.first);
                expect(user1.body.last_name).toEqual(user.last);
                expect(user1.body.window_start).toEqual(user.window);

                // add another
                user.email = '2';

                const user2 = await request(app)
                    .post('/api/user')
                    .send(user)
                    .set('Accept', 'application/json');

                expect(user2.headers['content-type']).toMatch(/json/);
                expect(user2.status).toEqual(200);

                expect(user2.body.id).toEqual(2);
                expect(user2.body.email).toEqual(user.email);
                expect(user2.body.first_name).toEqual(user.first);
                expect(user2.body.last_name).toEqual(user.last);
                expect(user2.body.window_start).toEqual(user.window);
            });

            test('GET /api/user', async () => {
                // user ID of first user created in GET: User
                const userID = 1;

                const expectedUser = {
                    email: '1',
                    password: '1',
                    first: '1',
                    last: '1',
                    window: '01:00',
                };

                const response = await request(app).get(`/api/user/${userID}`);

                expect(response.headers['content-type']).toMatch(/json/);
                expect(response.status).toEqual(200);

                expect(response.body.id).toEqual(userID);
                expect(response.body.email).toEqual(expectedUser.email);
                expect(response.body.first_name).toEqual(expectedUser.first);
                expect(response.body.last_name).toEqual(expectedUser.last);
                expect(response.body.window_start).toEqual(expectedUser.window);
            });

            test('GET /api/user', async () => {
                const response = await request(app).get(`/api/user`);

                expect(response.headers['content-type']).toMatch(/json/);
                expect(response.status).toEqual(200);
                expect(response.body[0].id).toEqual(1);
            });

            test('PUT /api/user/:id', async () => {
                const userID = 1;
                const body = { first: 'test' };
                const response = await request(app)
                    .put(`/api/user/${userID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                expect(response.headers['content-type']).toMatch(/json/);
                expect(response.status).toEqual(200);
                expect(response.body[0].first_name).toEqual(body.first);
            });

            test('DELETE /api/user/:id', async () => {
                let user = {
                    email: '3',
                    password: '1',
                    first: '1',
                    last: '1',
                    window: '01:00',
                };

                const userID = 3;
                const user3 = await request(app)
                    .post('/api/user')
                    .send(user)
                    .set('Accept', 'application/json');
                expect(user3.status).toEqual(200);

                const delResponse = await request(app)
                    .delete(`/api/user/${3}`)
                    .set('Accept', 'application/json');
                expect(delResponse.status).toEqual(200);
            });
        });

        // testing error handling within every route
        // (will include user error and edge cases)
        xdescribe('User CRUD Failure', () => {});

        describe('Friend & Friend Req CRUD Success', () => {
            // if a friend request gets sent
            test('POST /api/user/req/:id', async () => {
                const userID = 1;
                const friendID = 2;
                const body = { friend: friendID };

                const response = await request(app)
                    .post(`/api/user/req/${userID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                expect(response.status).toEqual(200);

                expect(response.body.user_id).toEqual(userID);
                expect(response.body.friend_id).toEqual(friendID);
                expect(response.body.request).toEqual(true);
            });

            // if get friend requests works
            // tests for both sent and received reqs
            test('GET /api/user/req/:id', async () => {
                const userID = 1;
                const friendID = 2;
                let response = await request(app).get(`/api/user/req/${userID}?reqs=sent`);

                expect(response.status).toEqual(200);
                expect(response.body[0].user_id).toEqual(userID);
                expect(response.body[0].friend_id).toEqual(friendID);
                expect(response.body[0].request).toEqual(true);

                response = await request(app).get(`/api/user/req/${friendID}?reqs=received`);

                expect(response.status).toEqual(200);
                expect(response.body[0].user_id).toEqual(userID);
                expect(response.body[0].friend_id).toEqual(friendID);
                expect(response.body[0].request).toEqual(true);
            });

            // if a friend request gets denied
            test('DELETE /api/user/req/:id', async () => {
                const userID = 1;
                const friendID = 2;
                const body = { friend: userID };

                // req.params.id is user denying the request (friend_id in DB)
                let response = await request(app)
                    .delete(`/api/user/req/${friendID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                expect(response.status).toEqual(200);

                response = await request(app).get(`/api/user/req/${userID}`);

                // makes sure friend request is deleted
                expect(Object.keys(response.body).length).toBe(0);
            });

            // if a friend request gets accepted
            test('POST /api/user/friend/:id', async () => {
                const userID = 1;
                const friendID = 2;
                const body = { friend: friendID };

                const newReq = await request(app)
                    .post(`/api/user/req/${userID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                expect(newReq.status).toEqual(200);

                body.friend = userID;

                const response = await request(app)
                    .post(`/api/user/friend/${friendID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                expect(response.status).toEqual(200);

                // original friend request row, should now be request=false
                expect(response.body.updated.user_id).toEqual(userID);
                expect(response.body.updated.friend_id).toEqual(friendID);
                expect(response.body.updated.request).toEqual(false);

                // new friend row, request=false
                expect(response.body.new.user_id).toEqual(friendID);
                expect(response.body.new.friend_id).toEqual(userID);
                expect(response.body.new.request).toEqual(false);
            });

            // if get friend list works
            test('GET /api/user/friend/:id', async () => {
                const userID = 1;
                const friendID = 2;
                let response = await request(app).get(`/api/user/friend/${userID}`);

                expect(response.status).toEqual(200);

                expect(response.body[0].user_id).toEqual(userID);
                expect(response.body[0].friend_id).toEqual(friendID);
                expect(response.body[0].request).toEqual(false);

                response = await request(app).get(`/api/user/friend/${friendID}`);

                expect(response.status).toEqual(200);

                expect(response.body[0].user_id).toEqual(friendID);
                expect(response.body[0].friend_id).toEqual(userID);
                expect(response.body[0].request).toEqual(false);
            });

            // if delete friend works
            test('DELETE /api/user/friend/:id', async () => {
                const userID = 1;
                const friendID = 2;
                const body = { friend: friendID };

                let response = await request(app)
                    .delete(`/api/user/friend/${userID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                // deletion should be successful
                expect(response.status).toEqual(200);

                // both users should now have no friends
                response = await request(app).get(`/api/user/friend/${userID}`);
                expect(Object.keys(response.body).length).toBeLessThan(1);
                response = await request(app).get(`/api/user/friend/${friendID}`);
                expect(Object.keys(response.body).length).toBeLessThan(1);

                // adds friends back for future tests
                await request(app)
                    .post(`/api/user/req/${userID}`)
                    .send(body)
                    .set('Accept', 'application/json');

                body.friend = userID;

                await request(app)
                    .post(`/api/user/friend/${friendID}`)
                    .send(body)
                    .set('Accept', 'application/json');
            });
        });

        xdescribe('Friend & Friend Req CRUD Failure', () => {});
    });

    describe('Post Router [/api/post routes]', () => {
        describe('Post CRUD Success', () => {
            // post gets created
            // get post
            // get all user posts (add another post)
            // get all user friend posts (add post to friend)
            // updates a post
            // deletes a post
        });
        xdescribe('Post CRUD Failure', () => {});
        describe('Comment CRUD Success', () => {
            // comment gets posted
            // get post comments
            // get user comments
            // updates a comment
            // deletes a comment
        });
        xdescribe('Comment CRUD Failure', () => {});
    });
});

export {};
