// Copyright (C) 2019, Zpalmtree
//
// Please see the included LICENSE file for more information.

import React from 'react';
import { checkText } from 'smile2emoji';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';

import {
    Linking, Keyboard, KeyboardAvoidingView, View, Text, TextInput, ScrollView, FlatList, Platform, TouchableWithoutFeedback, Image
} from 'react-native';
import Hyperlink from 'react-native-hyperlink'

import {
    validateAddresses, WalletErrorCode, validatePaymentID,
} from 'kryptokrona-wallet-backend-js';

import { Button as RNEButton, Alert, Modal, TouchableOpacity} from 'react-native';

import { Button, Input, Icon } from 'react-native-elements';

import Config from './Config';
import ListItem from './ListItem';
import List from './ListContainer';

import { Styles } from './Styles';

import Moment from 'react-moment';

const runes = require('runes');

import 'moment/locale/de';
import 'moment/locale/sv';
import 'moment/locale/tr';
import 'moment/locale/zh-cn';
import 'moment/locale/nb';

import { Globals } from './Globals';
import { Hr, BottomButton, CopyButton } from './SharedComponents';


import {intToRGB, hashCode, get_avatar, sendBoardsMessage, getBoardColors} from './HuginUtilities';

import {toastPopUp} from './Utilities';

import { getBoardSubscriptions, subscribeToBoard, markBoardsMessageAsRead, saveToDatabase, getBoardsMessages, getLatestMessages, removeMessage, markConversationAsRead, loadPayeeDataFromDatabase, removeBoard, getBoardRecommendations } from './Database';

import './i18n.js';
import { withTranslation } from 'react-i18next';

import {AutoGrowingTextInput} from 'react-native-autogrow-textinput';

String.prototype.hashCode = function() {
    var hash = 0;
    if (this.length == 0) {
        return hash;
    }
    for (var i = 0; i < this.length; i++) {
        var char = this.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

export class BoardsHomeScreenNoTranslation extends React.Component {

    constructor(props) {
        super(props);

        let board = this.props.navigation.state.params;
        console.log(board);

        if (board  == undefined) {
          board = 'Home';
        } else {
          board = board.board;
        }
        console.log(board);

        this.state = {
            messages: Globals.boardsMessages,
            index: 0,
            board: board,
            modalVisible: false,
            editingBoards: false,
            isSubscribedToBoard: false,
            messageModalVisible: false,
            activePost: {
                        "message": "",
                        "address": "",
                        "signature": "",
                        "board": "",
                        "timestamp": "",
                        "nickname": "",
                        "reply": "0",
                        "hash": "",
                        "sent": 0,
                        "read": 0
                    }
        }

        Globals.updateBoardsFunctions.push(() => {
            this.setState({
                messages: Globals.boardsMessages,
                boardssubscriptions: [{board: 'Home', key: 0}].concat(Globals.boardsSubscriptions)
            })
        });
    }

    async componentDidMount() {

        const this_messages = await getBoardsMessages(this.state.board);

        const boardsSubscriptions = [{board: 'Home', key: 0}].concat(Globals.boardsSubscriptions);

        const boardsRecommendationsItems = await getBoardRecommendations();

        this.setState({
          messages: this_messages,
          boardssubscriptions: boardsSubscriptions,
          isSubscribedToBoard: true,
          boardsRecommendationsItems: boardsRecommendationsItems
        });

        Globals.activeChat = this.state.address;


        let i = 0;

        while (i < this_messages.length) {

          i++;
          let this_msg = this_messages[i];
          console.log(this_msg);
          let this_hash = this_msg.hash;
          console.log(this_hash);
          if(!this_msg.read) {
              markBoardsMessageAsRead(this_hash);
          }


        }

    }

    setModalVisible = (visible) => {
      this.setState({ modalVisible: visible });
    }

    setMessageModalVisible = (visible) => {
      this.setState({ messageModalVisible: visible });
    }

    setActivePost = (item) => {
      this.setState({ activePost: item });
    }

    setEditingMode = (editing) => {
      this.setState({ editingBoards: editing })
    }

    render() {

      const { modalVisible, messageModalVisible, editingBoards, activePost } = this.state;

      const isSubscribedTo = (board) => {

        if (!boardsSubscriptionsItems) {
          return;
        }

        let sub = boardsSubscriptionsItems.filter(item => {return item.board == board});

        const result = sub.length > 0 ? true : false;

        return result;

      }

      const sendTip = (address, hash, name) => {
        console.log(name);
        const url = `xkr://?address=${address}&paymentid=${hash}&istip=true&name=${name}`;
        this.setMessageModalVisible(false);
        Linking.openURL(url);
      }

      const submitMessage = async (text) => {

        Keyboard.dismiss();

        let updated_messages = await getBoardsMessages(this.state.board);
        if (!updated_messages) {
          updated_messages = [];
        }
        let temp_timestamp = parseInt(Date.now() / 1000);
        updated_messages.unshift({
            board: this.state.board,
            address: Globals.wallet.getPrimaryAddress(),
            message: checkText(text),
            timestamp: temp_timestamp,
            hash: temp_timestamp.toString(),
            read: 1,
            nickname: Globals.preferences.nickname
        });

        this.setState({
          messages: updated_messages,
          messageHasLength: false,
          message: ''
        });

        this.input.clear();

        this.setState({messageHasLength: this.state.message.length > 0});

        let success = await sendBoardsMessage(checkText(text), this.state.board, this.state.paymentID);


        // await removeMessage(temp_timestamp);
        if (success.success) {


          // this.state.input.current.clear();
        } else {
          updated_messages = await getBoardsMessages(this.state.board);

            this.setState({
              messages: updated_messages,
              messageHasLength: true
            })

        }
      }

        const getBoard = async (board) => {
          const board_messages = await getBoardsMessages(board);
          Globals.activeBoard = board;
          this.setModalVisible(false);
          this.setState({
              board: board,
              messages: board_messages
          });
        }

        const deleteBoard = async (board) => {
          let newBoardsSubscriptions = this.state.boardssubscriptions;
          newBoardsSubscriptions = newBoardsSubscriptions.filter(item => { return item.board != board});
          removeBoard(board);
          this.setState({
              boardssubscriptions: newBoardsSubscriptions
          });
        }


        const { t } = this.props;
        const messages = this.state.messages;
        const boardsSubscriptionsItems = this.state.boardssubscriptions;
        const boardsRecommendationsItems = this.state.boardsRecommendationsItems;

        const board = this.state.board;
        this.state.isSubscribedToBoard = isSubscribedTo(this.state.board);
        const noMessagesComponent =
            <View style={{
                width: '100%',
            }}>

                <Text style={{
                    color: this.props.screenProps.theme.primaryColour,
                    marginTop: 10,
                    fontSize: 16
                }}>
                    {t('noMessages')}
                </Text>
            </View>;

        const newMessageIndicator =
          <Icon
            reverse
            name='ios-american-football'
            type='ionicon'
            color='#006BA7'
            size={0}
          />;

          const items =
              <ScrollView
              showsVerticalScrollIndicator={false}
               style={{
                  width: '100%',
                  height: '70%',
                  marginBottom: 20,
                  backgroundColor: this.props.screenProps.theme.backgroundColour,
                  borderWidth: 0,
                  borderColor: 'transparent'
              }}>
                      <FlatList
                          removeClippedSubviews={false}
                          extraData={this.state.index}
                          ItemSeparatorComponent={null}
                          data={messages}
                          keyExtractor={item => item.hash}
                          renderItem={({item}) => (
                              <ListItem
                                  title={board == 'Home' ? <View style={{flexDirection:"row", marginBottom: 10}}>
                                  <View style={{flexDirection:"row"}}>

                                  <Image
                                    style={{width: 50, height: 50, marginTop: -10}}
                                    source={{uri: get_avatar(item.address)}}
                                  />
                                  <View style={{width: 150, overflow: 'hidden'}}>
                                    <Text numberOfLines={1} ellipsizeMode={'tail'} style={{
                                        color: '#ffffff',
                                        fontSize: 18,
                                        fontFamily: "Montserrat-SemiBold"
                                    }}>{item.nickname ? item.nickname : 'Anonymous'}
                                    </Text>
                                    </View>
                                    </View>
                                    <View style={{
                                      backgroundColor: getBoardColors(item.board)[0],
                                      padding: 2,
                                      paddingBottom: 5,
                                      paddingTop: 8,
                                      borderRadius: 5,
                                      height: 20,
                                      marginLeft: 'auto'
                                    }}>
                                    <Text style={{
                                        marginLeft: 5,
                                        marginRight: 5,
                                        color: this.props.screenProps.theme.primaryColour,
                                        fontSize: 10,
                                        fontFamily: "Montserrat-Regular",
                                        marginTop: -5
                                    }}>

                                        {item.board}
                                    </Text>
                                    </View>

                                    </View> :
                                    <View style={{flexDirection:"row"}}>

                                    <Image
                                      style={{width: 50, height: 50, marginTop: -10}}
                                      source={{uri: get_avatar(item.address)}}
                                    />
                                    <View style={{width: 150, overflow: 'hidden'}}>
                                      <Text numberOfLines={1} ellipsizeMode={'tail'} style={{
                                          color: '#ffffff',
                                          fontSize: 18,
                                          fontFamily: "Montserrat-SemiBold"
                                      }}>{item.nickname ? item.nickname : 'Anonymous'}
                                      </Text>
                                      </View>
                                    </View>
                                  }
                                  subtitle={<Hyperlink linkDefault={ true }><Text selectable style={{fontFamily: "Montserrat-Regular"}}><Text selectable>{item.message + "\n"}</Text><Moment locale={Globals.language} style={{fontFamily: "Montserrat-Regular", fontSize: 10, textAlignVertical: 'bottom' }} element={Text} unix fromNow>{item.timestamp}</Moment></Text></Hyperlink>}
                                  subtitleStyle={{
                                      fontFamily: "Montserrat-Regular",
                                      overflow: 'hidden'
                                  }}
                                  chevron={item.read == '1' ? false : newMessageIndicator }
                                  titleStyle={{
                                      color: this.props.screenProps.theme.primaryColour,
                                      fontFamily: 'Montserrat-SemiBold'
                                  }}showsVerticalScrollIndicator={false}
                                  subtitleStyle={{
                                      color: this.props.screenProps.theme.slightlyMoreVisibleColour,
                                      fontFamily: 'Montserrat-Regular'
                                  }}
                                  onPress={async () => {

                                      //getBoard(item.board);
                                      console.log(item);
                                      this.setMessageModalVisible(true);
                                      this.setActivePost(item);

                                      // let messages = await getBoardsMessages(board);
                                      //
                                      // this.setState({
                                      //     board: item.board,
                                      //     messages: messages
                                      // });
                                      // this.props.navigation.navigate(
                                      //     'ChatScreen', {
                                      //         payee: item,
                                      //     }
                                      // );
                                      // await markBoardMessageAsRead(item.address);
                                      // Globals.payees = await loadPayeeDataFromDatabase();
                                      // this.setState({
                                      //     payees: Globals.payees
                                      // });
                                  }}
                              />
                          )}
                      />
              </ScrollView>;

        const messageComponent =
            <ScrollView
            showsVerticalScrollIndicator={false}
             style={{
                width: '100%',
                height: '70%',
                marginBottom: 20,
                backgroundColor: this.props.screenProps.theme.backgroundColour,
                borderWidth: 0,
                borderColor: 'transparent'
            }}>

                {items}

            </ScrollView>;


        const boardsSubscriptions =
            <ScrollView
            showsVerticalScrollIndicator={false}
             style={{
                width: '100%',
                height: '100%',
                marginBottom: 20,
                borderWidth: 0,
                borderColor: 'transparent',
                backgroundColor: 'transparent'
            }}>
                    <FlatList
                        extraData={this.state.index}
                        ItemSeparatorComponent={null}
                        data={boardsSubscriptionsItems}
                        keyExtractor={item => item.board}
                        style={{backgroundColor: 'transparent'}}
                        renderItem={({item}) => (
                            <ListItem
                                title={item.board}
                                titleStyle={{
                                    color: '#ffffff',
                                    fontFamily: 'Montserrat-SemiBold'
                                }}
                                leftIcon={!editingBoards || item.board == 'Home' ? <View style={{
                                    width: 50,
                                    height: 50,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: getBoardColors(item.board),
                                    borderRadius: 15
                                }}>
                                    <Text style={[Styles.centeredText, {
                                        fontSize: 30,
                                        lineHeight: 40,
                                        fontFamily: 'Montserrat-Bold',
                                        color: 'white',
                                    }]}>
                                        {runes(item.board)[0].toUpperCase()}
                                    </Text>

                                </View> :
                                <View style={{
                                    width: 50,
                                    height: 50,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#FF5F57',
                                    borderRadius: 15
                                }}>
                                    <Text style={[Styles.centeredText, {
                                      fontSize: 30,
                                      lineHeight: 38,
                                      color: 'white',
                                      fontFamily: 'Montserrat-Black',
                                    }]}>
                                      X
                                    </Text>

                                </View>
                                }
                                showsVerticalScrollIndicator={false}
                                onPress={async () => {
                                    !editingBoards || item.board == 'Home' ?
                                    getBoard(item.board)
                                    :
                                    deleteBoard(item.board)

                                }}
                            />
                        )}
                    />
            </ScrollView>;

            const storyStyle = {
              borderRadius: 25,
              width: 64,
              height: 64,
              backgroundColor: 'white',
              marginRight: 10,
              flexDirection:'row'
            };

            const storyTextStyle = [Styles.centeredText, {
                fontSize: 30,
                lineHeight: 60,
                width: 64,
                fontFamily: 'Montserrat-Bold',
                color: 'white',
                flex: 1,
                flexWrap: 'wrap'
            }];

            const boardsStories =
            <View style={{height:120}}>
                <ScrollView
                showsHorizontalScrollIndicator={false}
                horizontal={true}
                 style={{
                    width: '116%',
                    marginBottom: 20,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    backgroundColor: 'transparent',
                    marginLeft: -20,
                    marginRight: -29
                }}>
                {boardsSubscriptionsItems != undefined && boardsSubscriptionsItems.map(function(item, i){
                  return <View><TouchableOpacity onPress={async () => { getBoard(item.board) }} style={[storyStyle, {backgroundColor: getBoardColors(item.board)}]}><Text style={storyTextStyle}>{runes(item.board)[0].toUpperCase()}</Text></TouchableOpacity><Text style={{width: 64, textAlign: 'center', fontFamily: 'Montserrat-Regular'}}>{item.board}</Text></View>;
                })
                }
                </ScrollView>
                </View>;

            const boardsRecommendations =
            <View style={{height:142}}>
              <Text style={{fontFamily: 'Montserrat-Regular', marginBottom: 5}}>{t('boardsRecommendations')}</Text>
                <ScrollView
                showsHorizontalScrollIndicator={false}
                horizontal={true}
                 style={{
                    // width: '116%',
                    marginBottom: 20,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    backgroundColor: 'transparent',
                    // marginLeft: -29
                }}>
                {boardsRecommendationsItems != undefined && boardsRecommendationsItems.map(function(item, i){
                  return <View><TouchableOpacity onPress={async () => { getBoard(item.board) }} style={[storyStyle, {backgroundColor: getBoardColors(item.board)}]}><Text style={storyTextStyle}>{runes(item.board)[0].toUpperCase()}</Text></TouchableOpacity><Text style={{width: 64, textAlign: 'center', fontFamily: 'Montserrat-Regular'}}>{item.board}</Text></View>;
                })
                }
                </ScrollView>
                </View>;

            const boardsSubscriptionsComponent =
                <ScrollView
                showsVerticalScrollIndicator={false}
                 style={{
                    width: '120%',
                    marginBottom: 10,
                    marginLeft: '-10%',
                    borderWidth: 0,
                    borderColor: 'transparent'
                }}>

                    {boardsSubscriptions}

                </ScrollView>;

            const messageInput =
            <View
            style={{
                width: this.state.messageHasLength ? '80%' : '100%',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderWidth: 0,
                  borderColor: 'transparent',
                  borderRadius: 15
              }}
            >
            <AutoGrowingTextInput
                multiline={true}
                textAlignVertical={'top'}
                ref={input => { this.input = input }}
                style={{
                    color: this.props.screenProps.theme.primaryColour,
                    fontFamily: 'Montserrat-Regular',
                    fontSize: 15,
                    width: '100%',
                    height: '100%',
                    padding: 15,

                }}
                maxLength={512}
                placeholder={"✏️ " + t('typeMessageHere')}
                placeholderTextColor={'#ffffff'}
                onSubmitEditing={async (e) => {
                  e.preventDefault();
                    // return;
                    // submitMessage(this.state.message);
                    // this.setState({message: '', messageHasLength: false});
                }}
                onChangeText={(text) => {
                    if (this.props.onChange) {
                        this.props.onChange(text);
                    }
                    this.state.message = text;
                    this.setState({messageHasLength: this.state.message.length > 0});
                }}
                errorMessage={this.props.error}
            />
            </View>;

        return(
            <View style={{
                backgroundColor: this.props.screenProps.theme.backgroundColour,
                flex: 1,
                alignItems: 'flex-start',
                justifyContent: 'flex-start',
            }}>
                <View style={{
                    flex: 1,
                    marginLeft: 30,
                    marginTop: 15,
                    width: '85%',
                }}>
                    <TouchableWithoutFeedback
                        onPress={() => {
                            this.setModalVisible(true)
                        }}
                    >
                        <View style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            height: 40,
                            marginBottom: 15
                        }}>



                            <Text style={{
                                marginLeft: 15,
                                color: this.props.screenProps.theme.primaryColour,
                                fontSize: 24,
                                fontFamily: "Montserrat-SemiBold"
                            }}>
                                {t('boardsTitle')}
                            </Text>

                            {!this.state.isSubscribedToBoard &&
                              <TouchableWithoutFeedback
                                  onPress={async () => {
                                      if ( isSubscribedTo(board) ) {
                                        return;
                                      }
                                      this.setState({isSubscribedToBoard: true});
                                      subscribeToBoard(board, 0);
                                      const subs = this.state.boardssubscriptions;
                                      subs.push({board: board,key: 0});
                                      this.state.boardssubscriptions = subs;
                                      this.state.boardsRecommendationsItems = await getBoardRecommendations();
                                  }}
                              >
                              <View style={{
                                backgroundColor: this.props.screenProps.theme.buttonColour,
                                padding: 5,
                                paddingTop: 8,
                                borderRadius: 5,
                                height: 28
                              }}>
                              <Text style={{
                                  marginLeft: 5,
                                  marginRight: 5,
                                  color: this.props.screenProps.theme.primaryColour,
                                  fontSize: 16,
                                  fontFamily: "Montserrat-SemiBold",
                                  marginTop: -5
                              }}>
                                  ➕ {t('subscribe')}
                              </Text>
                              </View>
                              </TouchableWithoutFeedback>
                            }

                            <View style={{
                              backgroundColor: getBoardColors(board)[0],
                              padding: 5,
                              paddingTop: 8,
                              borderRadius: 5,
                              height: 28
                            }}>
                            <Text style={{
                                marginLeft: 5,
                                marginRight: 5,
                                color: this.props.screenProps.theme.primaryColour,
                                fontSize: 16,
                                fontFamily: "Montserrat-SemiBold",
                                marginTop: -5
                            }}>

                                {board}
                            </Text>
                            </View>


                        </View>
                    </TouchableWithoutFeedback>

                    {this.state.board == 'Home' && boardsSubscriptionsItems != undefined && boardsSubscriptionsItems.length > 1 && boardsStories}

                    {this.state.board == 'Home' && boardsSubscriptionsItems != undefined && boardsSubscriptionsItems.length < 2 && boardsRecommendations}

                    {this.state.board && this.state.board != 'Home' && <KeyboardAvoidingView
                     behavior={Platform.OS == "ios" ? "padding" : "height"}
                     style={{
                        marginBottom: 10,
                        marginRight: 12,
                        flexDirection: 'row'
                    }}>
                        {messageInput}

                        {this.state.messageHasLength &&

                            <TouchableOpacity
                                onPress={() => {
                                  submitMessage(this.state.message);
                                  this.setState({message: '', messageHasLength: false});
                                }}
                            >
                              <View style={{
                                backgroundColor: '#63D880',
                                padding: 5,
                                paddingTop: 8,
                                borderRadius: 5,
                                height: 28,
                                marginTop: 20,
                                marginLeft: 10
                              }}>
                              <Text style={{
                                  marginLeft: 5,
                                  marginRight: 5,
                                  color: this.props.screenProps.theme.primaryColour,
                                  fontSize: 16,
                                  fontFamily: "Montserrat-SemiBold",
                                  marginTop: -5
                              }}>
                            {t('send')}
                            </Text>
                            </View>
                            </TouchableOpacity>

                        }

                    </KeyboardAvoidingView>}

                    <View>
                      <Modal
                        style={{}}
                        animationType="slide"
                        transparent={true}
                        visible={modalVisible}
                        onRequestClose={() => {
                          this.setModalVisible(!modalVisible);
                        }}
                      >
                        <View style={{
                          margin: 20,
                          backgroundColor: '#272527',
                          borderRadius: 20,
                          padding: 25,
                          alignItems: "center",
                          shadowColor: "#000",
                          shadowOffset: {
                            width: 0,
                            height: 2
                          },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 5
                        }}>
                          <View>
                            <Text style={{
                                marginLeft: 35,
                                color: '#ffffff',
                                fontSize: 24,
                                fontFamily: "Montserrat-SemiBold"
                            }}>{t('myBoards')}
                            </Text>

                            <View
                            style={{
                                // width: this.state.messageHasLength ? '80%' : '100%',
                                  width: 225,
                                  backgroundColor: 'rgba(255,255,255,0.1)',
                                  borderWidth: 0,
                                  borderColor: 'transparent',
                                  borderRadius: 15,
                                  height: 50,
                                  margin: 15,
                                  padding: 7
                              }}
                            >
                            <TextInput
                                multiline={false}
                                textAlignVertical={'bottom'}
                                ref={boardinput => { this.boardinput = boardinput }}
                                style={{
                                    color: this.props.screenProps.theme.primaryColour,
                                    fontFamily: 'Montserrat-Regular',
                                    fontSize: 15,
                                    paddingTop: 2,
                                    paddingBottom: 6

                                }}
                                maxLength={20}
                                placeholder={  "➕ " + t('subscribe')}
                                placeholderTextColor={'#ffffff'}
                                onSubmitEditing={async (e) => {
                                  e.preventDefault();

                                  subscribeToBoard(this.state.boardinput, 0);

                                  const subs = this.state.boardssubscriptions;
                                  subs.push({board: this.state.boardinput,key: 0});

                                  this.state.boardssubscriptions = subs;
                                  this.setModalVisible(!modalVisible);

                                    getBoard(this.state.boardinput);
                                    // return;
                                    // submitMessage(this.state.message);
                                    // this.setState({message: '', messageHasLength: false});
                                }}
                                onChangeText={(text) => {
                                    if (this.props.onChange) {
                                        this.props.onChange(text);
                                    }
                                    this.state.boardinput = text;
                                }}
                                errorMessage={this.props.error}
                            />
                            </View>

                            <View style={{
                                backgroundColor: 'transparent',
                                height: 300,
                                alignItems: 'flex-start',
                                justifyContent: 'flex-start',
                            }}>
                            { boardsSubscriptionsComponent }

                            </View>
                            <View style={{flexDirection:"row", marginBottom: 10}}>
                              <View style={{width: '40%', marginLeft: 25 }}>
                                <Button
                                  title={t('edit')}
                                  onPress={() => this.setEditingMode(!editingBoards)}
                                />
                              </View>
                              <View style={{width: '40%', marginLeft: 10 }}>
                                <Button
                                  title={t('close')}
                                  onPress={() => this.setModalVisible(!modalVisible)}
                                />
                              </View>
                            </View>
                          </View>
                          {boardsRecommendationsItems != undefined && boardsRecommendations}
                        </View>
                      </Modal>
                    </View>



                    <View>
                      <Modal
                        style={{}}
                        animationType="slide"
                        transparent={true}
                        visible={messageModalVisible}
                        onRequestClose={() => {
                          this.setMessageModalVisible(!messageModalVisible);
                        }}
                      >
                        <View style={{
                          margin: 20,
                          backgroundColor: '#272527',
                          borderRadius: 20,
                          padding: 25,
                          alignItems: "center",
                          shadowColor: "#000",
                          shadowOffset: {
                            width: 0,
                            height: 2
                          },
                          shadowOpacity: 0.25,
                          shadowRadius: 4,
                          elevation: 5
                        }}>
                          <View style={{
                            margin: 10
                          }}>

                          <View style={{flexDirection:"row", marginBottom: 10}}>

                          <Image
                            style={{width: 50, height: 50, marginTop: -10}}
                            source={{uri: get_avatar(this.state.activePost.address)}}
                          />
                          <View style={{width: 150, overflow: 'hidden'}}>
                            <Text numberOfLines={1} ellipsizeMode={'tail'} style={{
                                color: '#ffffff',
                                fontSize: 18,
                                fontFamily: "Montserrat-SemiBold"
                            }}>{this.state.activePost.nickname ? this.state.activePost.nickname : 'Anonymous'}
                            </Text>
                            </View>
                            {board == 'Home' &&
                            <View>
                            <View style={{
                              backgroundColor: getBoardColors(this.state.activePost.board)[0],
                              padding: 2,
                              paddingBottom: 5,
                              paddingTop: 8,
                              borderRadius: 5,
                              height: 20,
                              marginLeft: 'auto'
                            }}>
                            <Text ellipsizeMode={'tail'} numberOfLines={2} style={{
                                marginLeft: 5,
                                marginRight: 5,
                                color: this.props.screenProps.theme.primaryColour,
                                fontSize: 10,
                                fontFamily: "Montserrat-Regular",
                                marginTop: -5
                            }}>

                                {this.state.activePost.board}
                              </Text>
                            </View>
                            </View>
                           }


                            </View>
                            <View style={{paddingLeft: 20, paddingRight: 20}}>


                              <Text selectable>{this.state.activePost.message + "\n"}</Text>
                              <Moment locale={Globals.language} style={{fontFamily: "Montserrat-Regular", fontSize: 10, textAlignVertical: 'bottom' }} element={Text} unix fromNow>{this.state.activePost.timestamp}</Moment>


                            </View>
                        </View>

                        <View style={{flexDirection:"row", marginBottom: 10}}>
                          <View style={{width: (this.state.board == 'Home' ? '40%' : 0), marginLeft: (this.state.board == 'Home' ? 15 : 0) }}>
                          {this.state.board == 'Home' &&
                            <Button
                              title={"Go to board"}
                              onPress={() => {
                                getBoard(this.state.activePost.board);
                                this.setMessageModalVisible(false);
                              }}
                            />
                          }
                          </View>
                          <View style={{width: (this.state.board == 'Home' ? '40%' : '85%'), marginLeft: (this.state.board == 'Home' ? 10 : 15  ) }}>
                            <Button
                              title={t('close')}
                              onPress={() => this.setMessageModalVisible(false)}
                            />
                          </View>
                        </View>

                        <View style={{width: '85%', marginLeft: 15 }}>
                          <Button
                            title={'Send tip'}
                            onPress={() => sendTip(this.state.activePost.address, this.state.activePost.hash, this.state.activePost.nickname)}
                          />
                        </View>

                      </View>
                      </Modal>
                    </View>



                    <View style={{
                        backgroundColor: this.props.screenProps.theme.backgroundColour,
                        flex: 1,
                        marginRight: 5,
                        alignItems: 'flex-start',
                        justifyContent: 'flex-start',
                    }}>

                        {this.state.messages.length > 0 ? messageComponent : noMessagesComponent}

                    </View>
                </View>
            </View>
        );
    }
}

export const BoardsHomeScreen = withTranslation()(BoardsHomeScreenNoTranslation)

function isPaymentIDValid(paymentID) {
    let errorMessage = '';

    if (paymentID === '') {
        return [true, errorMessage];
    }

    if (paymentID === undefined || paymentID === null) {
        return [false, errorMessage];
    }

    const paymentIDError = validatePaymentID(paymentID);

    if (paymentIDError.errorCode !== WalletErrorCode.SUCCESS) {
        errorMessage = paymentIDError.toString();

        return [false, errorMessage];
    }

    return [true, errorMessage];
}
